from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.template import Template
from app.schemas.template import TemplateCreate, TemplateUpdate, TemplateOut

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("/", response_model=List[TemplateOut])
def list_templates(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Template).filter(Template.owner_id == current_user.id).all()


@router.post("/", response_model=TemplateOut, status_code=status.HTTP_201_CREATED)
def create_template(body: TemplateCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    template = Template(
        **body.model_dump(),
        owner_id=current_user.id,
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.get("/{template_id}", response_model=TemplateOut)
def get_template(template_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    template = db.query(Template).filter(Template.id == template_id, Template.owner_id == current_user.id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.put("/{template_id}", response_model=TemplateOut)
def update_template(template_id: str, body: TemplateUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    template = db.query(Template).filter(Template.id == template_id, Template.owner_id == current_user.id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(template, field, value)
    db.commit()
    db.refresh(template)
    return template


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(template_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    template = db.query(Template).filter(Template.id == template_id, Template.owner_id == current_user.id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(template)
    db.commit()
