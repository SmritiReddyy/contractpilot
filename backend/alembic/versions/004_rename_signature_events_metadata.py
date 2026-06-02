"""Rename signature_events.metadata to event_metadata

Revision ID: 004
Revises: 003
Create Date: 2024-01-04
"""
from alembic import op

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column("signature_events", "metadata", new_column_name="event_metadata")


def downgrade():
    op.alter_column("signature_events", "event_metadata", new_column_name="metadata")
