from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_KEY: str
    SUPABASE_DB_URL: str

    ANTHROPIC_API_KEY: str

    # Resend (preferred) — set this and emails go via Resend SDK
    RESEND_API_KEY: str = ""
    # From address: use onboarding@resend.dev for testing, your domain for production
    EMAIL_FROM: str = "onboarding@resend.dev"

    # SMTP fallback (Gmail, etc.) — only used if RESEND_API_KEY is empty
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "onboarding@resend.dev"

    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_URL: str = "http://localhost:8000"

    class Config:
        env_file = ".env"


settings = Settings()
