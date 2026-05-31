import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base


# Event types:
#   viewed        — signing link opened
#   otp_sent      — OTP email dispatched
#   otp_verified  — OTP entered correctly
#   otp_failed    — wrong OTP attempt
#   signed        — contract signed
#   declined      — signer declined
class SignatureEvent(Base):
    __tablename__ = "signature_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    signer_id = Column(UUID(as_uuid=True), ForeignKey("signers.id"), nullable=False)
    event_type = Column(String, nullable=False)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    event_metadata = Column(JSONB, nullable=True)   # e.g. {"decline_reason": "..."} or otp attempt count
    created_at = Column(DateTime, default=datetime.utcnow)

    signer = relationship("Signer", back_populates="signature_events")
