"""Add signing order and mode

Revision ID: 006
Revises: 005
Create Date: 2024-01-06
"""
from alembic import op
import sqlalchemy as sa

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("signers", sa.Column("signing_order", sa.Integer, nullable=False, server_default="1"))
    op.add_column("signers", sa.Column("signing_mode", sa.String, nullable=True, server_default="parallel"))
    op.add_column("contracts", sa.Column("signing_mode", sa.String, nullable=True, server_default="parallel"))


def downgrade():
    op.drop_column("signers", "signing_order")
    op.drop_column("signers", "signing_mode")
    op.drop_column("contracts", "signing_mode")
