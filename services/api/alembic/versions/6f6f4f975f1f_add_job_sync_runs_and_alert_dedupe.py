"""add job sync runs and alert dedupe

Revision ID: 6f6f4f975f1f
Revises: 50de55dfebe4
Create Date: 2026-08-24 16:25:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = "6f6f4f975f1f"
down_revision = "50de55dfebe4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("job_alerts", sa.Column("dedupe_key", sa.String(length=120), nullable=False, server_default=""))
    op.create_index(op.f("ix_job_alerts_dedupe_key"), "job_alerts", ["dedupe_key"], unique=False)
    op.alter_column("job_alerts", "dedupe_key", server_default=None)

    op.create_table(
        "job_sync_runs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("source", sa.String(length=20), nullable=False),
        sa.Column("row_count", sa.Integer(), nullable=False),
        sa.Column("created", sa.Integer(), nullable=False),
        sa.Column("updated", sa.Integer(), nullable=False),
        sa.Column("unchanged", sa.Integer(), nullable=False),
        sa.Column("closed", sa.Integer(), nullable=False),
        sa.Column("alerts_created", sa.Integer(), nullable=False),
        sa.Column("triggered_by", sa.String(length=30), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_job_sync_runs_source"), "job_sync_runs", ["source"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_job_sync_runs_source"), table_name="job_sync_runs")
    op.drop_table("job_sync_runs")
    op.drop_index(op.f("ix_job_alerts_dedupe_key"), table_name="job_alerts")
    op.drop_column("job_alerts", "dedupe_key")
