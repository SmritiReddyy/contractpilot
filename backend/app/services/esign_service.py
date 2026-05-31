import hashlib
import secrets
import string
from datetime import datetime, timedelta
from passlib.context import CryptContext

otp_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

TOKEN_EXPIRY_DAYS = 30
OTP_EXPIRY_MINUTES = 15


def hash_content(content: str) -> str:
    """SHA-256 hash of contract text — stored at signing time to prove what was signed."""
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def generate_otp() -> str:
    """Cryptographically random 6-digit OTP."""
    return "".join(secrets.choice(string.digits) for _ in range(6))


def hash_otp(otp: str) -> str:
    return otp_context.hash(otp)


def verify_otp(plain: str, hashed: str) -> bool:
    return otp_context.verify(plain, hashed)


def token_expiry() -> datetime:
    return datetime.utcnow() + timedelta(days=TOKEN_EXPIRY_DAYS)


def otp_expiry() -> datetime:
    return datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)


def is_expired(dt: datetime | None) -> bool:
    if dt is None:
        return False
    return datetime.utcnow() > dt


def build_certificate(contract, signer, events: list) -> dict:
    """Build the structured signature certificate payload."""
    return {
        "certificate_version": "1.0",
        "contract_id": str(contract.id),
        "contract_title": contract.title,
        "content_hash": signer.content_hash,
        "hash_algorithm": "SHA-256",
        "signer": {
            "name": signer.name,
            "email": signer.email,
            "ip_address": signer.ip_address,
            "user_agent": signer.user_agent,
        },
        "signed_at": signer.signed_at.isoformat() if signer.signed_at else None,
        "token_id": signer.token,
        "audit_trail": [
            {
                "event": e.event_type,
                "timestamp": e.created_at.isoformat(),
                "ip_address": e.ip_address,
                "user_agent": e.user_agent,
                **(e.metadata or {}),
            }
            for e in events
        ],
        "certificate_generated_at": datetime.utcnow().isoformat(),
        "legal_notice": (
            "This certificate is an electronic record of the signing process. "
            "The content hash (SHA-256) identifies the exact document version that was signed. "
            "The audit trail records all relevant events with timestamps and IP addresses."
        ),
    }
