"""面试准备：InterviewPlan。"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.profile import JSONType


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class InterviewPlan(Base):
    __tablename__ = "interview_plans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    application_id: Mapped[str] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"), unique=True, index=True
    )
    # 主题清单（按 JD 映射）
    topics: Mapped[list] = mapped_column(JSONType, default=list)
    # 问题清单（关联题库 / 项目追问）
    questions: Mapped[list] = mapped_column(JSONType, default=list)
    # 复习进度 0-100
    progress: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    application: Mapped[object] = relationship("Application", back_populates="interview_plan")
