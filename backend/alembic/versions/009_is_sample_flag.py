"""Add is_sample flag to contracts, templates, clauses

Revision ID: 009
Revises: 008
Create Date: 2024-01-06
"""
from alembic import op
import sqlalchemy as sa

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("contracts", sa.Column("is_sample", sa.Boolean, server_default="false", nullable=False))
    op.add_column("templates", sa.Column("is_sample", sa.Boolean, server_default="false", nullable=False))
    op.add_column("clauses",   sa.Column("is_sample", sa.Boolean, server_default="false", nullable=False))


def downgrade():
    op.drop_column("contracts", "is_sample")
    op.drop_column("templates", "is_sample")
    op.drop_column("clauses",   "is_sample")
