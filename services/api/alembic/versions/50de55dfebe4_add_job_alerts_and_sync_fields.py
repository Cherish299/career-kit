"""add job alerts and sync fields

Revision ID: 50de55dfebe4
Revises: 46f046296328
Create Date: 2026-08-24 16:05:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = "50de55dfebe4"
down_revision = "46f046296328"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "job_alerts",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("job_id", sa.String(length=36), nullable=False),
        sa.Column("type", sa.String(length=20), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_job_alerts_job_id"), "job_alerts", ["job_id"], unique=False)
    op.create_index(op.f("ix_job_alerts_type"), "job_alerts", ["type"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_job_alerts_type"), table_name="job_alerts")
    op.drop_index(op.f("ix_job_alerts_job_id"), table_name="job_alerts")
    op.drop_table("job_alerts")
