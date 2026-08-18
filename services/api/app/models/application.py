"""投递管线：Application 状态机 + Application / ApplicationEvent。"""
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


# ---- 状态机（计划书：发现 → 收藏 → 待投递 → 已投递 → 笔试 → 一面 → 后续面试 → Offer/拒绝/放弃） ----

APPLICATION_STATUSES: tuple[str, ...] = (
    "discovered",   # 发现
    "favorited",    # 收藏
    "to_submit",    # 待投递
    "submitted",    # 已投递
    "written_test",  # 笔试
    "interview_1",  # 一面
    "interview_next",  # 后续面试
    "offer",        # Offer
    "rejected",     # 拒绝
    "abandoned",    # 放弃
)

APPLICATION_STATUS_DISPLAY: dict[str, str] = {
    "discovered": "发现",
    "favorited": "收藏",
    "to_submit": "待投递",
    "submitted": "已投递",
    "written_test": "笔试",
    "interview_1": "一面",
    "interview_next": "后续面试",
    "offer": "Offer",
    "rejected": "拒绝",
    "abandoned": "放弃",
}

# 合法状态转换表（不可达的状态禁止流转）
APPLICATION_TRANSITIONS: dict[str, set[str]] = {
    "discovered": {"favorited", "to_submit", "abandoned"},
    "favorited": {"discovered", "to_submit", "abandoned"},
    "to_submit": {"discovered", "submitted", "abandoned"},
    "submitted": {"written_test", "interview_1", "rejected"},
    "written_test": {"interview_1", "rejected", "abandoned"},
    "interview_1": {"interview_next", "offer", "rejected", "abandoned"},
    "interview_next": {"offer", "rejected", "abandoned"},
    "offer": set(),
    "rejected": set(),
    "abandoned": set(),
}

TERMINAL_STATUSES: frozenset[str] = frozenset({"offer", "rejected", "abandoned"})


class InvalidTransitionError(ValueError):
    """状态机非法转换。"""


def validate_transition(from_status: str, to_status: str) -> None:
    """校验状态转换合法性；非法时抛 InvalidTransitionError。"""
    if from_status not in APPLICATION_TRANSITIONS:
        raise InvalidTransitionError(f"未知状态: {from_status!r}")
    if to_status not in APPLICATION_STATUSES:
        raise InvalidTransitionError(f"未知目标状态: {to_status!r}")
    if from_status in TERMINAL_STATUSES:
        raise InvalidTransitionError(f"终态 {from_status!r} 不可再流转")
    if to_status not in APPLICATION_TRANSITIONS[from_status]:
        raise InvalidTransitionError(
            f"非法状态转换: {from_status!r} -> {to_status!r}"
            f"（允许: {sorted(APPLICATION_TRANSITIONS[from_status])}）"
        )


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    profile_id: Mapped[str] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    job_id: Mapped[str] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"), index=True)
    resume_version_id: Mapped[str | None] = mapped_column(
        ForeignKey("resume_versions.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(20), default="discovered", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    events: Mapped[list[ApplicationEvent]] = relationship(
        back_populates="application", cascade="all, delete-orphan", order_by="ApplicationEvent.occurred_at"
    )
    interview_plan: Mapped[InterviewPlan | None] = relationship(
        back_populates="application", uselist=False, cascade="all, delete-orphan"
    )


class ApplicationEvent(Base):
    __tablename__ = "application_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    application_id: Mapped[str] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"), index=True
    )
    event_type: Mapped[str] = mapped_column(String(50), default="status_change")
    from_status: Mapped[str] = mapped_column(String(20), default="")
    to_status: Mapped[str] = mapped_column(String(20), default="")
    note: Mapped[str] = mapped_column(Text, default="")
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    application: Mapped[Application] = relationship(back_populates="events")


# 前向引用（interview_plan 关系类型注解）
from app.models.interview import InterviewPlan  # noqa: E402
