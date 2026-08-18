"""材料工作室：ResumeVersion。"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class ResumeVersion(Base):
    __tablename__ = "resume_versions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    profile_id: Mapped[str] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    job_id: Mapped[str | None] = mapped_column(ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True)
    # 母版版本 id（不为空表示是该岗位的定制副本；不覆盖母版）
    parent_id: Mapped[str] = mapped_column(String(36), default="")
    name: Mapped[str] = mapped_column(String(200), default="")
    # 简历内容（HTML 或结构化 JSON 文本）
    content: Mapped[str] = mapped_column(Text, default="")
    template_id: Mapped[str] = mapped_column(String(50), default="tech")
    style: Mapped[str] = mapped_column(String(30), default="blue")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    profile: Mapped[object] = relationship("Profile")
    job: Mapped[object] = relationship("Job")
