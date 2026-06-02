"""Add revoked_at to signers

Revision ID: 005
Revises: 004
Create Date: 2024-01-05
"""
from alembic import op
import sqlalchemy as sa

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("signers", sa.Column("revoked_at", sa.DateTime, nullable=True))


def downgrade():
    op.drop_column("signers", "revoked_at")
