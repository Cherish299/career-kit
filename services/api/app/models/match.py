"""匹配：MatchReport。"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.profile import JSONType


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class MatchReport(Base):
    __tablename__ = "match_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    profile_id: Mapped[str] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    job_id: Mapped[str] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"), index=True)
    # 分层分数：{hard, keyword, semantic, total}
    scores: Mapped[dict] = mapped_column(JSONType, default=dict)
    strengths: Mapped[list] = mapped_column(JSONType, default=list)
    gaps: Mapped[list] = mapped_column(JSONType, default=list)
    # 证据：逐项 {claim, source, detail}
    evidence: Mapped[list] = mapped_column(JSONType, default=list)
    # 硬条件是否阻塞（不满足时 true，不可被语义分掩盖）
    blocked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    profile: Mapped[object] = relationship("Profile")
    job: Mapped[object] = relationship("Job")
