import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Text, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base


class Signer(Base):
    __tablename__ = "signers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    email = Column(String, nullable=False)
    name = Column(String, nullable=True)

    # Signature outcome
    signed_at = Column(DateTime, nullable=True)
    ip_address = Column(String, nullable=True)
    content_hash = Column(String, nullable=True)       # SHA-256 of contract content at signing time
    user_agent = Column(String, nullable=True)

    # Decline
    declined_at = Column(DateTime, nullable=True)
    decline_reason = Column(Text, nullable=True)

    # Revocation
    revoked_at = Column(DateTime, nullable=True)

    # Link lifecycle
    token = Column(String, unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    token_expires_at = Column(DateTime, nullable=True)

    # View tracking
    viewed_at = Column(DateTime, nullable=True)        # first time link was opened

    # OTP email verification
    otp_code = Column(String, nullable=True)           # bcrypt hash of the 6-digit code
    otp_expires_at = Column(DateTime, nullable=True)
    otp_verified = Column(Boolean, default=False)

    # Extra metadata (browser, locale, screen size, etc.)
    signing_metadata = Column(JSONB, nullable=True)

    signing_order = Column(Integer, nullable=False, default=1)

    created_at = Column(DateTime, default=datetime.utcnow)

    contract = relationship("Contract", back_populates="signers")
    signature_events = relationship(
        "SignatureEvent", back_populates="signer",
        cascade="all, delete-orphan", order_by="SignatureEvent.created_at"
    )
