"""add public profile fields

Revision ID: 8f8db1afcb51
Revises: 6f6f4f975f1f
Create Date: 2026-08-24 16:45:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "8f8db1afcb51"
down_revision = "6f6f4f975f1f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    json_list = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")
    op.add_column("profiles", sa.Column("public_slug", sa.String(length=80), nullable=False, server_default=""))
    op.add_column("profiles", sa.Column("public_fields", json_list, nullable=False, server_default="[]"))
    op.create_index(op.f("ix_profiles_public_slug"), "profiles", ["public_slug"], unique=False)
    op.alter_column("profiles", "public_slug", server_default=None)
    op.alter_column("profiles", "public_fields", server_default=None)


def downgrade() -> None:
    op.drop_index(op.f("ix_profiles_public_slug"), table_name="profiles")
    op.drop_column("profiles", "public_fields")
    op.drop_column("profiles", "public_slug")
