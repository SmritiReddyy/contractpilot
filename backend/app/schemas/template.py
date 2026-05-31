from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime
import uuid


class TemplateVariable(BaseModel):
    name: str
    label: str
    type: str = "text"  # text, date, number


class TemplateCreate(BaseModel):
    title: str
    description: Optional[str] = None
    content: str
    variables: List[TemplateVariable] = []


class TemplateUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    variables: Optional[List[TemplateVariable]] = None


class TemplateOut(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str]
    content: str
    variables: List[Any]
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
