from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import date as date_type
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
from app.models.milestone import Milestone
from app.schemas.contract import (
    ContractCreate, ContractUpdate, ContractOut, ContractSummary,
    SignerCreate, OTPVerify, SigningRequest, DeclineRequest,
    RiskReport, SignatureCertificate,
)
from app.services.email_service import (
    send_signing_invite, send_otp_email,
    send_signature_confirmation, send_owner_signed_notification,
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
        event_metadata=extra_meta,
    ))


def _get_signer_or_404(token: str, db: Session) -> Signer:
    signer = db.query(Signer).filter(Signer.token == token).first()
    if not signer:
        raise HTTPException(status_code=404, detail="Invalid signing link")
    if is_expired(signer.token_expires_at):
        raise HTTPException(status_code=410, detail="This signing link has expired")
    if signer.revoked_at:
        raise HTTPException(status_code=410, detail="This signing link has been revoked")
    if signer.declined_at:
        raise HTTPException(status_code=409, detail="This contract was already declined")
    return signer


# ─────────────────────────────────────────────
# Authenticated contract CRUD
# ─────────────────────────────────────────────

@router.get("/dashboard", response_model=dict)
def dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from datetime import date, timedelta
    from sqlalchemy import func
    today = date.today()
    soon = today + timedelta(days=30)

    base = (Contract.owner_id == current_user.id) & (Contract.is_sample == False)

    total    = db.query(Contract).filter(base).count()
    active   = db.query(Contract).filter(base, Contract.status == ContractStatus.sent).count()
    signed   = db.query(Contract).filter(base, Contract.status == ContractStatus.signed).count()
    expired  = db.query(Contract).filter(base, Contract.status == ContractStatus.expired).count()
    draft    = db.query(Contract).filter(base, Contract.status == ContractStatus.draft).count()
    expiring = (
        db.query(Contract)
        .filter(
            base,
            Contract.end_date <= soon,
            Contract.end_date >= today,
            Contract.status.notin_([ContractStatus.expired, ContractStatus.signed]),
        ).count()
    )
    recent = (
        db.query(Contract)
        .filter(base)
        .order_by(Contract.updated_at.desc())
        .limit(5).all()
    )

    owner_contract_ids = [c.id for c in db.query(Contract.id).filter(base).all()]

    pending_signers = 0
    if owner_contract_ids:
        pending_signers = db.query(Signer).filter(
            Signer.contract_id.in_(owner_contract_ids),
            Signer.signed_at == None,
            Signer.revoked_at == None,
            Signer.declined_at == None,
        ).count()

    signed_contracts = db.query(Contract).filter(
        Contract.owner_id == current_user.id,
        Contract.status == ContractStatus.signed,
    ).all()

    avg_days_to_sign = None
    if signed_contracts:
        days_list = []
        for c in signed_contracts:
            last_signer = db.query(Signer).filter(
                Signer.contract_id == c.id,
                Signer.signed_at != None,
            ).order_by(Signer.signed_at.desc()).first()
            if last_signer and last_signer.signed_at:
                delta = (last_signer.signed_at - c.created_at).days
                days_list.append(delta)
        if days_list:
            avg_days_to_sign = round(sum(days_list) / len(days_list), 1)

    overdue_milestones = 0
    if owner_contract_ids:
        overdue_milestones = db.query(Milestone).filter(
            Milestone.contract_id.in_(owner_contract_ids),
            Milestone.due_date < today,
            Milestone.status != "completed",
        ).count()

    return {
        "total": total, "active": active, "signed": signed,
        "expired": expired, "expiring_soon": expiring,
        "draft": draft,
        "by_status": {"draft": draft, "sent": active, "signed": signed, "expired": expired},
        "pending_signers": pending_signers,
        "avg_days_to_sign": avg_days_to_sign,
        "overdue_milestones": overdue_milestones,
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


@router.post("/{contract_id}/duplicate", response_model=ContractOut, status_code=status.HTTP_201_CREATED)
def duplicate_contract(contract_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    original = db.query(Contract).filter(Contract.id == contract_id, Contract.owner_id == current_user.id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Contract not found")
    copy = Contract(
        title=f"Copy of {original.title}",
        content=original.content,
        owner_id=current_user.id,
        template_id=original.template_id,
        start_date=original.start_date,
        end_date=original.end_date,
        reminder_date=original.reminder_date,
    )
    db.add(copy)
    db.flush()
    _save_version(db, copy)
    db.commit()
    db.refresh(copy)
    return copy


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

    existing_signers = db.query(Signer).filter(Signer.contract_id == contract_id).count()
    if existing_signers == 0:
        contract.signing_mode = body.signing_mode

    token = str(uuid.uuid4())
    signer = Signer(
        contract_id=contract_id,
        email=body.email,
        name=body.name,
        token=token,
        token_expires_at=token_expiry(),
        signing_order=body.signing_order,
    )
    db.add(signer)

    if contract.status == ContractStatus.draft:
        contract.status = ContractStatus.sent

    db.commit()
    db.refresh(signer)

    signing_url = f"{settings.FRONTEND_URL}/sign/{token}"

    should_send = True
    if contract.signing_mode == "sequential" and body.signing_order > 1:
        lower_order_signers = db.query(Signer).filter(
            Signer.contract_id == contract_id,
            Signer.signing_order < body.signing_order,
            Signer.revoked_at == None,
        ).all()
        all_lower_signed = all(s.signed_at is not None for s in lower_order_signers)
        should_send = all_lower_signed

    if should_send:
        background_tasks.add_task(send_signing_invite, body.email, body.name or body.email, contract.title, signing_url)

    return {
        "signer_id": str(signer.id),
        "token": token,
        "signing_url": signing_url,
        "expires_at": signer.token_expires_at.isoformat(),
    }


@router.delete("/{contract_id}/signers/{signer_id}", response_model=dict)
def revoke_signer(
    contract_id: str,
    signer_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contract = db.query(Contract).filter(Contract.id == contract_id, Contract.owner_id == current_user.id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    signer = db.query(Signer).filter(Signer.id == signer_id, Signer.contract_id == contract_id).first()
    if not signer:
        raise HTTPException(status_code=404, detail="Signer not found")
    if signer.signed_at:
        raise HTTPException(status_code=409, detail="Cannot revoke — signer has already signed")
    if signer.revoked_at:
        raise HTTPException(status_code=409, detail="Signing link already revoked")

    signer.revoked_at = datetime.utcnow()
    db.commit()
    return {"message": "Signing link revoked successfully"}


@router.post("/{contract_id}/owner-sign", response_model=dict)
async def owner_sign(
    contract_id: str,
    body: SigningRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contract = db.query(Contract).filter(Contract.id == contract_id, Contract.owner_id == current_user.id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    if not body.consent:
        raise HTTPException(status_code=400, detail="Consent is required to sign electronically")

    ip = request.client.host
    ua = request.headers.get("user-agent", "")
    content_hash = hash_content(contract.content)
    signed_at = datetime.utcnow()

    # Create a Signer record for the owner
    signer = Signer(
        contract_id=contract_id,
        email=current_user.email,
        name=body.name or current_user.full_name,
        token=str(uuid.uuid4()),
        token_expires_at=token_expiry(),
        signed_at=signed_at,
        otp_verified=True,
        ip_address=ip,
        user_agent=ua,
        content_hash=content_hash,
        signing_metadata=body.metadata or {},
    )
    db.add(signer)
    db.flush()

    _record_event(db, signer.id, "signed", ip=ip, ua=ua, extra_meta={
        "content_hash": content_hash,
        "consent_given": True,
        "owner_signed": True,
    })

    # Check if all signers have signed
    all_signers = db.query(Signer).filter(Signer.contract_id == contract.id).all()
    if all(s.signed_at or s.id == signer.id for s in all_signers):
        contract.status = ContractStatus.signed

    db.commit()

    return {
        "signed_at": signed_at.isoformat(),
        "content_hash": content_hash,
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
                "metadata": event.event_metadata,
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

    # Notify the contract owner that someone signed
    owner = db.query(User).filter(User.id == contract.owner_id).first()
    if owner:
        background_tasks.add_task(
            send_owner_signed_notification,
            owner.email, owner.full_name or owner.email,
            signer.name or signer.email, signer.email, contract.title,
        )

    if contract.signing_mode == "sequential":
        next_signers = db.query(Signer).filter(
            Signer.contract_id == contract.id,
            Signer.signing_order == signer.signing_order + 1,
            Signer.signed_at == None,
            Signer.revoked_at == None,
        ).all()
        for ns in next_signers:
            ns_url = f"{settings.FRONTEND_URL}/sign/{ns.token}"
            background_tasks.add_task(send_signing_invite, ns.email, ns.name or ns.email, contract.title, ns_url)

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


# ─────────────────────────────────────────────
# AI Summary
# ─────────────────────────────────────────────

@router.post("/{contract_id}/summarize", response_model=dict)
def summarize_contract_endpoint(contract_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.services.ai_service import summarize_contract
    contract = db.query(Contract).filter(Contract.id == contract_id, Contract.owner_id == current_user.id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    return summarize_contract(contract.content)


# ─────────────────────────────────────────────
# Milestones
# ─────────────────────────────────────────────

from pydantic import BaseModel as PydanticBaseModel

class MilestoneCreate(PydanticBaseModel):
    title: str
    description: Optional[str] = None
    due_date: date_type
    status: str = "pending"

class MilestoneUpdate(PydanticBaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[date_type] = None
    status: Optional[str] = None


@router.post("/{contract_id}/milestones", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_milestone(
    contract_id: str,
    body: MilestoneCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contract = db.query(Contract).filter(Contract.id == contract_id, Contract.owner_id == current_user.id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    milestone = Milestone(contract_id=contract_id, **body.model_dump())
    db.add(milestone)
    db.commit()
    db.refresh(milestone)
    return {
        "id": str(milestone.id),
        "contract_id": str(milestone.contract_id),
        "title": milestone.title,
        "description": milestone.description,
        "due_date": milestone.due_date.isoformat(),
        "status": milestone.status,
        "created_at": milestone.created_at.isoformat(),
    }


@router.get("/{contract_id}/milestones", response_model=List[dict])
def list_milestones(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contract = db.query(Contract).filter(Contract.id == contract_id, Contract.owner_id == current_user.id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    milestones = db.query(Milestone).filter(Milestone.contract_id == contract_id).order_by(Milestone.due_date).all()
    return [
        {
            "id": str(m.id),
            "contract_id": str(m.contract_id),
            "title": m.title,
            "description": m.description,
            "due_date": m.due_date.isoformat(),
            "status": m.status,
            "created_at": m.created_at.isoformat(),
        }
        for m in milestones
    ]


@router.patch("/{contract_id}/milestones/{milestone_id}", response_model=dict)
def update_milestone(
    contract_id: str,
    milestone_id: str,
    body: MilestoneUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contract = db.query(Contract).filter(Contract.id == contract_id, Contract.owner_id == current_user.id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    milestone = db.query(Milestone).filter(Milestone.id == milestone_id, Milestone.contract_id == contract_id).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(milestone, field, value)
    db.commit()
    db.refresh(milestone)
    return {
        "id": str(milestone.id),
        "contract_id": str(milestone.contract_id),
        "title": milestone.title,
        "description": milestone.description,
        "due_date": milestone.due_date.isoformat(),
        "status": milestone.status,
        "created_at": milestone.created_at.isoformat(),
    }


@router.delete("/{contract_id}/milestones/{milestone_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_milestone(
    contract_id: str,
    milestone_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contract = db.query(Contract).filter(Contract.id == contract_id, Contract.owner_id == current_user.id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    milestone = db.query(Milestone).filter(Milestone.id == milestone_id, Milestone.contract_id == contract_id).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    db.delete(milestone)
    db.commit()
