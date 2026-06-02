from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.clause import Clause

router = APIRouter(prefix="/clauses", tags=["clauses"])


class ClauseCreate(BaseModel):
    title: str
    content: str
    category: Optional[str] = None


class ClauseUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None


def _clause_out(c: Clause) -> dict:
    return {
        "id": str(c.id),
        "owner_id": str(c.owner_id),
        "title": c.title,
        "content": c.content,
        "category": c.category,
        "created_at": c.created_at.isoformat(),
    }


@router.get("/", response_model=List[dict])
def list_clauses(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    clauses = db.query(Clause).filter(Clause.owner_id == current_user.id).order_by(Clause.created_at.desc()).all()
    return [_clause_out(c) for c in clauses]


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_clause(body: ClauseCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    clause = Clause(owner_id=current_user.id, **body.model_dump())
    db.add(clause)
    db.commit()
    db.refresh(clause)
    return _clause_out(clause)


@router.put("/{clause_id}", response_model=dict)
def update_clause(clause_id: str, body: ClauseUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    clause = db.query(Clause).filter(Clause.id == clause_id, Clause.owner_id == current_user.id).first()
    if not clause:
        raise HTTPException(status_code=404, detail="Clause not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(clause, field, value)
    db.commit()
    db.refresh(clause)
    return _clause_out(clause)


@router.delete("/{clause_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_clause(clause_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    clause = db.query(Clause).filter(Clause.id == clause_id, Clause.owner_id == current_user.id).first()
    if not clause:
        raise HTTPException(status_code=404, detail="Clause not found")
    db.delete(clause)
    db.commit()
