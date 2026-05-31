"""E-sign security: OTP, content hash, audit trail, token expiry

Revision ID: 002
Revises: 001
Create Date: 2024-01-02
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade():
    # signers — new security columns
    op.add_column("signers", sa.Column("content_hash", sa.String, nullable=True))
    op.add_column("signers", sa.Column("user_agent", sa.String, nullable=True))
    op.add_column("signers", sa.Column("declined_at", sa.DateTime, nullable=True))
    op.add_column("signers", sa.Column("decline_reason", sa.Text, nullable=True))
    op.add_column("signers", sa.Column("token_expires_at", sa.DateTime, nullable=True))
    op.add_column("signers", sa.Column("viewed_at", sa.DateTime, nullable=True))
    op.add_column("signers", sa.Column("otp_code", sa.String, nullable=True))
    op.add_column("signers", sa.Column("otp_expires_at", sa.DateTime, nullable=True))
    op.add_column("signers", sa.Column("otp_verified", sa.Boolean, server_default="false", nullable=False))
    op.add_column("signers", sa.Column("signing_metadata", JSONB, nullable=True))

    # contracts — tamper detection
    op.add_column("contracts", sa.Column("locked_content_hash", sa.String, nullable=True))

    # signature_events — richer metadata
    op.add_column("signature_events", sa.Column("metadata", JSONB, nullable=True))


def downgrade():
    op.drop_column("signers", "content_hash")
    op.drop_column("signers", "user_agent")
    op.drop_column("signers", "declined_at")
    op.drop_column("signers", "decline_reason")
    op.drop_column("signers", "token_expires_at")
    op.drop_column("signers", "viewed_at")
    op.drop_column("signers", "otp_code")
    op.drop_column("signers", "otp_expires_at")
    op.drop_column("signers", "otp_verified")
    op.drop_column("signers", "signing_metadata")
    op.drop_column("contracts", "locked_content_hash")
    op.drop_column("signature_events", "metadata")
