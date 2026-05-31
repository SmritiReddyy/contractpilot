from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import datetime
import uuid

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.contract import Contract, ContractStatus
from app.models.contract_version import ContractVersion
from app.models.signer import Signer
from app.models.signature_event import SignatureEvent
from app.schemas.contract import (
    ContractCreate, ContractUpdate, ContractOut, ContractSummary,
    SignerCreate, OTPVerify, SigningRequest, DeclineRequest,
    RiskReport, SignatureCertificate,
)
from app.services.email_service import (
    send_signing_invite, send_otp_email,
    send_signature_confirmation,
)
from app.services.ai_service import analyze_contract_risk
from app.services.esign_service import (
    hash_content, generate_otp, hash_otp, verify_otp,
    token_expiry, otp_expiry, is_expired, build_certificate,
)

router = APIRouter(prefix="/contracts", tags=["contracts"])

MAX_OTP_ATTEMPTS = 5


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def _save_version(db: Session, contract: Contract):
    last = (
        db.query(ContractVersion)
        .filter(ContractVersion.contract_id == contract.id)
        .order_by(ContractVersion.version_number.desc())
        .first()
    )
    db.add(ContractVersion(
        contract_id=contract.id,
        content=contract.content,
        version_number=(last.version_number + 1) if last else 1,
    ))


def _record_event(db: Session, signer_id, event_type: str, request: Request = None,
                  extra_meta: dict = None, ip: str = None, ua: str = None):
    db.add(SignatureEvent(
        signer_id=signer_id,
        event_type=event_type,
        ip_address=ip or (request.client.host if request else None),
        user_agent=ua or (request.headers.get("user-agent") if request else None),
        metadata=extra_meta,
    ))


def _get_signer_or_404(token: str, db: Session) -> Signer:
    signer = db.query(Signer).filter(Signer.token == token).first()
    if not signer:
        raise HTTPException(status_code=404, detail="Invalid signing link")
    if is_expired(signer.token_expires_at):
        raise HTTPException(status_code=410, detail="This signing link has expired")
    if signer.declined_at:
        raise HTTPException(status_code=409, detail="This contract was already declined")
    return signer


# ─────────────────────────────────────────────
# Authenticated contract CRUD
# ─────────────────────────────────────────────

@router.get("/dashboard", response_model=dict)
def dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from datetime import date, timedelta
    today = date.today()
    soon = today + timedelta(days=30)

    total    = db.query(Contract).filter(Contract.owner_id == current_user.id).count()
    active   = db.query(Contract).filter(Contract.owner_id == current_user.id, Contract.status == ContractStatus.sent).count()
    signed   = db.query(Contract).filter(Contract.owner_id == current_user.id, Contract.status == ContractStatus.signed).count()
    expired  = db.query(Contract).filter(Contract.owner_id == current_user.id, Contract.status == ContractStatus.expired).count()
    expiring = (
        db.query(Contract)
        .filter(
            Contract.owner_id == current_user.id,
            Contract.end_date <= soon,
            Contract.end_date >= today,
            Contract.status.notin_([ContractStatus.expired, ContractStatus.signed]),
        ).count()
    )
    recent = (
        db.query(Contract)
        .filter(Contract.owner_id == current_user.id)
        .order_by(Contract.updated_at.desc())
        .limit(5).all()
    )
    return {
        "total": total, "active": active, "signed": signed,
        "expired": expired, "expiring_soon": expiring,
        "recent": [ContractSummary.model_validate(c) for c in recent],
    }


@router.get("/", response_model=List[ContractSummary])
def list_contracts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Contract).filter(Contract.owner_id == current_user.id).order_by(Contract.updated_at.desc()).all()


@router.post("/", response_model=ContractOut, status_code=status.HTTP_201_CREATED)
def create_contract(body: ContractCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    contract = Contract(**body.model_dump(), owner_id=current_user.id)
    db.add(contract)
    db.flush()
    _save_version(db, contract)
    db.commit()
    db.refresh(contract)
    return contract


@router.get("/{contract_id}", response_model=ContractOut)
def get_contract(contract_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    contract = (
        db.query(Contract)
        .options(
            joinedload(Contract.versions),
            joinedload(Contract.signers).joinedload(Signer.signature_events),
        )
        .filter(Contract.id == contract_id, Contract.owner_id == current_user.id)
        .first()
    )
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    return contract


@router.put("/{contract_id}", response_model=ContractOut)
def update_contract(contract_id: str, body: ContractUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    contract = db.query(Contract).filter(Contract.id == contract_id, Contract.owner_id == current_user.id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    content_changed = body.content and body.content != contract.content

    # Tamper detection: warn if content changes after signers added
    if content_changed and contract.locked_content_hash:
        new_hash = hash_content(body.content)
        if new_hash != contract.locked_content_hash:
            # Still allow the update but clear the lock so the owner knows
            contract.locked_content_hash = None

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(contract, field, value)

    if content_changed:
        _save_version(db, contract)

    db.commit()
    db.refresh(contract)
    return contract


@router.delete("/{contract_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contract(contract_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    contract = db.query(Contract).filter(Contract.id == contract_id, Contract.owner_id == current_user.id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    db.delete(contract)
    db.commit()


@router.post("/{contract_id}/versions/{version_id}/restore", response_model=ContractOut)
def restore_version(contract_id: str, version_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    contract = db.query(Contract).filter(Contract.id == contract_id, Contract.owner_id == current_user.id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    version = db.query(ContractVersion).filter(ContractVersion.id == version_id, ContractVersion.contract_id == contract_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    contract.content = version.content
    contract.locked_content_hash = None  # content changed — invalidate lock
    _save_version(db, contract)
    db.commit()
    db.refresh(contract)
    return contract


# ─────────────────────────────────────────────
# Signer management (authenticated)
# ─────────────────────────────────────────────

@router.post("/{contract_id}/signers", response_model=dict)
async def add_signer(
    contract_id: str,
    body: SignerCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contract = db.query(Contract).filter(Contract.id == contract_id, Contract.owner_id == current_user.id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    # Lock the content hash when first signer is added
    if not contract.locked_content_hash:
        contract.locked_content_hash = hash_content(contract.content)

    token = str(uuid.uuid4())
    signer = Signer(
        contract_id=contract_id,
        email=body.email,
        name=body.name,
        token=token,
        token_expires_at=token_expiry(),
    )
    db.add(signer)

    if contract.status == ContractStatus.draft:
        contract.status = ContractStatus.sent

    db.commit()
    db.refresh(signer)

    signing_url = f"{settings.FRONTEND_URL}/sign/{token}"
    background_tasks.add_task(send_signing_invite, body.email, body.name or body.email, contract.title, signing_url)

    return {
        "signer_id": str(signer.id),
        "token": token,
        "signing_url": signing_url,
        "expires_at": signer.token_expires_at.isoformat(),
    }


@router.get("/{contract_id}/audit", response_model=dict)
def get_audit_trail(contract_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    contract = (
        db.query(Contract)
        .options(joinedload(Contract.signers).joinedload(Signer.signature_events))
        .filter(Contract.id == contract_id, Contract.owner_id == current_user.id)
        .first()
    )
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    trail = []
    for signer in contract.signers:
        for event in signer.signature_events:
            trail.append({
                "signer_email": signer.email,
                "signer_name": signer.name,
                "event_type": event.event_type,
                "ip_address": event.ip_address,
                "user_agent": event.user_agent,
                "metadata": event.metadata,
                "timestamp": event.created_at.isoformat(),
            })

    trail.sort(key=lambda x: x["timestamp"])

    is_tampered = bool(contract.locked_content_hash) and (
        hash_content(contract.content) != contract.locked_content_hash
    )

    return {
        "contract_id": str(contract.id),
        "contract_title": contract.title,
        "locked_content_hash": contract.locked_content_hash,
        "current_content_hash": hash_content(contract.content),
        "tampered": is_tampered,
        "events": trail,
    }


# ─────────────────────────────────────────────
# Public signing flow (no auth required)
# ─────────────────────────────────────────────

@router.get("/sign/{token}", response_model=dict)
def get_signing_page(token: str, request: Request, db: Session = Depends(get_db)):
    signer = _get_signer_or_404(token, db)
    if signer.signed_at:
        return {
            "already_signed": True,
            "signed_at": signer.signed_at.isoformat(),
            "contract_title": db.query(Contract).filter(Contract.id == signer.contract_id).first().title,
        }

    contract = db.query(Contract).filter(Contract.id == signer.contract_id).first()

    # Record first view
    if not signer.viewed_at:
        signer.viewed_at = datetime.utcnow()
        _record_event(db, signer.id, "viewed", request)

    db.commit()

    return {
        "already_signed": False,
        "contract_title": contract.title,
        "contract_content": contract.content,
        "signer_name": signer.name,
        "signer_email": signer.email,
        "otp_verified": signer.otp_verified,
        "token_expires_at": signer.token_expires_at.isoformat() if signer.token_expires_at else None,
    }


@router.post("/sign/{token}/send-otp", response_model=dict)
async def send_otp(token: str, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    signer = _get_signer_or_404(token, db)
    if signer.signed_at:
        raise HTTPException(status_code=409, detail="Already signed")

    contract = db.query(Contract).filter(Contract.id == signer.contract_id).first()

    otp = generate_otp()
    signer.otp_code = hash_otp(otp)
    signer.otp_expires_at = otp_expiry()
    signer.otp_verified = False
    db.commit()

    _record_event(db, signer.id, "otp_sent", request)
    db.commit()

    background_tasks.add_task(send_otp_email, signer.email, signer.name or signer.email, otp, contract.title)

    return {"message": f"OTP sent to {signer.email}", "expires_in_minutes": 15}


@router.post("/sign/{token}/verify-otp", response_model=dict)
def verify_otp_endpoint(token: str, body: OTPVerify, request: Request, db: Session = Depends(get_db)):
    signer = _get_signer_or_404(token, db)
    if signer.signed_at:
        raise HTTPException(status_code=409, detail="Already signed")

    if not signer.otp_code:
        raise HTTPException(status_code=400, detail="No OTP has been sent yet")

    if is_expired(signer.otp_expires_at):
        _record_event(db, signer.id, "otp_failed", request, {"reason": "expired"})
        db.commit()
        raise HTTPException(status_code=400, detail="OTP has expired — request a new one")

    if not verify_otp(body.code.strip(), signer.otp_code):
        _record_event(db, signer.id, "otp_failed", request, {"reason": "wrong_code"})
        db.commit()
        raise HTTPException(status_code=400, detail="Incorrect code")

    signer.otp_verified = True
    _record_event(db, signer.id, "otp_verified", request)
    db.commit()

    return {"verified": True}


@router.post("/sign/{token}", response_model=dict)
async def submit_signature(
    token: str,
    body: SigningRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    signer = _get_signer_or_404(token, db)
    if signer.signed_at:
        raise HTTPException(status_code=409, detail="Already signed")

    if not signer.otp_verified:
        raise HTTPException(status_code=403, detail="Email not verified — complete OTP verification first")

    if not body.consent:
        raise HTTPException(status_code=400, detail="Consent is required to sign electronically")

    contract = db.query(Contract).filter(Contract.id == signer.contract_id).first()

    ip = request.client.host
    ua = request.headers.get("user-agent", "")

    signer.name = body.name
    signer.signed_at = datetime.utcnow()
    signer.ip_address = ip
    signer.user_agent = ua
    signer.content_hash = hash_content(contract.content)
    signer.signing_metadata = body.metadata or {}

    _record_event(db, signer.id, "signed", ip=ip, ua=ua, extra_meta={
        "content_hash": signer.content_hash,
        "consent_given": True,
    })

    # Auto-sign the contract if all signers have signed
    all_signers = db.query(Signer).filter(Signer.contract_id == contract.id).all()
    if all(s.signed_at or s.id == signer.id for s in all_signers):
        contract.status = ContractStatus.signed

    db.commit()
    db.refresh(signer)

    background_tasks.add_task(
        send_signature_confirmation,
        signer.email, signer.name, contract.title,
        signer.signed_at.isoformat(), signer.content_hash,
    )

    return {
        "message": "Contract signed successfully",
        "signed_at": signer.signed_at.isoformat(),
        "content_hash": signer.content_hash,
    }


@router.post("/sign/{token}/decline", response_model=dict)
def decline_signing(token: str, body: DeclineRequest, request: Request, db: Session = Depends(get_db)):
    signer = _get_signer_or_404(token, db)
    if signer.signed_at:
        raise HTTPException(status_code=409, detail="Already signed — cannot decline")

    signer.declined_at = datetime.utcnow()
    signer.decline_reason = body.reason

    _record_event(db, signer.id, "declined", request, {"reason": body.reason})
    db.commit()

    return {"message": "You have declined to sign this contract"}


@router.get("/sign/{token}/certificate", response_model=dict)
def get_signature_certificate(token: str, db: Session = Depends(get_db)):
    signer = db.query(Signer).options(joinedload(Signer.signature_events)).filter(Signer.token == token).first()
    if not signer:
        raise HTTPException(status_code=404, detail="Invalid token")
    if not signer.signed_at:
        raise HTTPException(status_code=400, detail="Contract not yet signed")

    contract = db.query(Contract).filter(Contract.id == signer.contract_id).first()
    return build_certificate(contract, signer, signer.signature_events)


# ─────────────────────────────────────────────
# AI Risk Analysis
# ─────────────────────────────────────────────

@router.post("/{contract_id}/analyze", response_model=RiskReport)
def analyze_contract(contract_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    contract = db.query(Contract).filter(Contract.id == contract_id, Contract.owner_id == current_user.id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    return analyze_contract_risk(contract.content)
