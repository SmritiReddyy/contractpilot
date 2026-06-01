import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.password_reset import PasswordResetToken
from app.schemas.user import (
    UserCreate, UserLogin, UserOut, Token,
    ForgotPasswordRequest, ResetPasswordRequest,
)
from app.services.email_service import send_password_reset_email

router = APIRouter(prefix="/auth", tags=["auth"])

# Separate bcrypt context for reset tokens (not user passwords)
_token_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
RESET_TOKEN_EXPIRY_HOURS = 1


def _hash_token(raw: str) -> str:
    return _token_ctx.hash(raw)


def _verify_token(raw: str, hashed: str) -> bool:
    return _token_ctx.verify(raw, hashed)


# ─────────────────────────────────────────────
# Auth routes
# ─────────────────────────────────────────────

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token, token_type="bearer", user=UserOut.model_validate(user))


@router.post("/token", response_model=Token)
def login_form(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token, token_type="bearer", user=UserOut.model_validate(user))


@router.post("/login", response_model=Token)
def login_json(user_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token, token_type="bearer", user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# ─────────────────────────────────────────────
# Password reset
# ─────────────────────────────────────────────

@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
async def forgot_password(
    body: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Always returns 202 regardless of whether the email exists — prevents
    user enumeration attacks. The reset email is sent in the background.
    """
    user = db.query(User).filter(User.email == body.email).first()

    if user:
        # Invalidate any existing unused tokens for this email
        db.query(PasswordResetToken).filter(
            PasswordResetToken.email == body.email,
            PasswordResetToken.used == False,  # noqa: E712
        ).update({"used": True})

        # Generate a cryptographically secure raw token (never stored)
        raw_token = secrets.token_urlsafe(48)
        reset_record = PasswordResetToken(
            email=body.email,
            token_hash=_hash_token(raw_token),
            expires_at=datetime.utcnow() + timedelta(hours=RESET_TOKEN_EXPIRY_HOURS),
        )
        db.add(reset_record)
        db.commit()

        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={raw_token}&email={body.email}"
        background_tasks.add_task(send_password_reset_email, body.email, reset_url)

    # Always return the same response (no user-enumeration leakage)
    return {"message": "If an account with that email exists, a reset link has been sent."}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Validates the reset token, updates the user's password, and invalidates
    the token so it cannot be reused.
    """
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    # Find all valid (unused, unexpired) tokens and check against the raw token
    valid_records = db.query(PasswordResetToken).filter(
        PasswordResetToken.used == False,  # noqa: E712
        PasswordResetToken.expires_at > datetime.utcnow(),
    ).all()

    matched: PasswordResetToken | None = None
    for record in valid_records:
        if _verify_token(body.token, record.token_hash):
            matched = record
            break

    if not matched:
        raise HTTPException(
            status_code=400,
            detail="This reset link is invalid or has expired. Please request a new one.",
        )

    user = db.query(User).filter(User.email == matched.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update password and invalidate the token
    user.hashed_password = hash_password(body.new_password)
    matched.used = True
    db.commit()

    return {"message": "Password updated successfully. You can now sign in with your new password."}
