"""个人中心：Profile / Experience / Skill / Preference。"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


# 跨数据库 JSON 类型：PostgreSQL 用 JSONB，其余（测试 SQLite）用 JSON
JSONType = JSON().with_variant(JSONB(), "postgresql")


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    display_name: Mapped[str] = mapped_column(String(200), default="")
    summary: Mapped[str] = mapped_column(Text, default="")
    # 字段可见性：public / shared / private（默认最小公开）
    visibility: Mapped[str] = mapped_column(String(20), default="private")
    # 原始 Resume Kit JSON 导入快照（迁移与回滚用）
    resume_json: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    experiences: Mapped[list[Experience]] = relationship(
        back_populates="profile", cascade="all, delete-orphan", order_by="Experience.order_index"
    )
    skills: Mapped[list[Skill]] = relationship(back_populates="profile", cascade="all, delete-orphan")
    preference: Mapped[Preference | None] = relationship(
        back_populates="profile", uselist=False, cascade="all, delete-orphan"
    )


class Experience(Base):
    __tablename__ = "experiences"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    profile_id: Mapped[str] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    # 类型：education / internship / project / campus / research / award / other
    type: Mapped[str] = mapped_column(String(20), index=True)
    title: Mapped[str] = mapped_column(String(300), default="")
    role: Mapped[str] = mapped_column(String(200), default="")
    organization: Mapped[str] = mapped_column(String(300), default="")
    # 日期用宽松字符串（兼容 "2024-09" / "至今"）
    start_date: Mapped[str] = mapped_column(String(30), default="")
    end_date: Mapped[str] = mapped_column(String(30), default="")
    content: Mapped[str] = mapped_column(Text, default="")
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    # 原字段兜底（gpa / rank / tech / venue / level / note 等）
    extra: Mapped[dict] = mapped_column(JSONType, default=dict)

    profile: Mapped[Profile] = relationship(back_populates="experiences")


class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    profile_id: Mapped[str] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100), default="")
    items: Mapped[str] = mapped_column(Text, default="")
    level: Mapped[str] = mapped_column(String(30), default="")
    evidence_experience_id: Mapped[str] = mapped_column(String(36), default="")

    profile: Mapped[Profile] = relationship(back_populates="skills")


class Preference(Base):
    __tablename__ = "preferences"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    profile_id: Mapped[str] = mapped_column(
        ForeignKey("profiles.id", ondelete="CASCADE"), unique=True, index=True
    )
    roles: Mapped[list] = mapped_column(JSONType, default=list)
    locations: Mapped[list] = mapped_column(JSONType, default=list)
    industries: Mapped[list] = mapped_column(JSONType, default=list)
    job_types: Mapped[list] = mapped_column(JSONType, default=list)
    salary_expectation: Mapped[str] = mapped_column(String(50), default="")
    graduate_year: Mapped[str] = mapped_column(String(20), default="")
    availability: Mapped[str] = mapped_column(String(50), default="")

    profile: Mapped[Profile] = relationship(back_populates="preference")
