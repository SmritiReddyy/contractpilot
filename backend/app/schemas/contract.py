from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from datetime import datetime, date
import uuid
from app.models.contract import ContractStatus


class ContractCreate(BaseModel):
    title: str
    content: str
    template_id: Optional[uuid.UUID] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    reminder_date: Optional[date] = None


class ContractUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    status: Optional[ContractStatus] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    reminder_date: Optional[date] = None


class ContractVersionOut(BaseModel):
    id: uuid.UUID
    contract_id: uuid.UUID
    content: str
    version_number: int
    created_at: datetime

    class Config:
        from_attributes = True


class SignatureEventOut(BaseModel):
    id: uuid.UUID
    event_type: str
    ip_address: Optional[str]
    user_agent: Optional[str]
    event_metadata: Optional[Dict]
    created_at: datetime

    class Config:
        from_attributes = True


class SignerOut(BaseModel):
    id: uuid.UUID
    email: str
    name: Optional[str]
    signed_at: Optional[datetime]
    declined_at: Optional[datetime]
    decline_reason: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    content_hash: Optional[str]
    viewed_at: Optional[datetime]
    otp_verified: bool
    token: str
    token_expires_at: Optional[datetime]
    created_at: datetime
    signature_events: List[SignatureEventOut] = []

    class Config:
        from_attributes = True


class ContractOut(BaseModel):
    id: uuid.UUID
    title: str
    status: ContractStatus
    content: str
    template_id: Optional[uuid.UUID]
    owner_id: uuid.UUID
    start_date: Optional[date]
    end_date: Optional[date]
    reminder_date: Optional[date]
    locked_content_hash: Optional[str]
    created_at: datetime
    updated_at: datetime
    versions: List[ContractVersionOut] = []
    signers: List[SignerOut] = []

    class Config:
        from_attributes = True


class ContractSummary(BaseModel):
    id: uuid.UUID
    title: str
    status: ContractStatus
    owner_id: uuid.UUID
    start_date: Optional[date]
    end_date: Optional[date]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SignerCreate(BaseModel):
    email: str
    name: Optional[str] = None


class OTPRequest(BaseModel):
    pass  # token is in the URL


class OTPVerify(BaseModel):
    code: str


class SigningRequest(BaseModel):
    name: str
    consent: bool   # must be True — explicit consent to e-sign
    metadata: Optional[Dict] = None  # browser info passed from frontend


class DeclineRequest(BaseModel):
    reason: Optional[str] = None


class RiskReport(BaseModel):
    clauses: List[Any]
    summary: str


class SignatureCertificate(BaseModel):
    contract_id: str
    contract_title: str
    content_hash: str
    signer_name: str
    signer_email: str
    signed_at: str
    ip_address: str
    user_agent: str
    audit_trail: List[Dict]
    certificate_generated_at: str
