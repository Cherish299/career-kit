"""匹配 / 简历版本 / 投递 / 面试计划 Schemas。"""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.application import APPLICATION_STATUSES, validate_transition


class MatchReportCreate(BaseModel):
    profile_id: str
    job_id: str
    scores: dict = Field(default_factory=dict)
    strengths: list[str] = Field(default_factory=list)
    gaps: list[str] = Field(default_factory=list)
    evidence: list[dict] = Field(default_factory=list)
    blocked: bool = False


class MatchReportRead(MatchReportCreate):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: datetime


class ResumeVersionCreate(BaseModel):
    profile_id: str
    job_id: str | None = None
    parent_id: str = ""
    name: str = ""
    content: str = ""
    template_id: str = "tech"
    style: str = "blue"


class ResumeVersionRead(ResumeVersionCreate):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: datetime


class ApplicationCreate(BaseModel):
    profile_id: str
    job_id: str
    resume_version_id: str | None = None
    status: str = "discovered"

    @field_validator("status")
    @classmethod
    def _status_valid(cls, v: str) -> str:
        if v not in APPLICATION_STATUSES:
            raise ValueError(f"未知状态: {v!r}")
        return v


class ApplicationStatusUpdate(BaseModel):
    """投递状态转换请求；由状态机校验合法性。"""

    to_status: str

    @field_validator("to_status")
    @classmethod
    def _status_valid(cls, v: str) -> str:
        if v not in APPLICATION_STATUSES:
            raise ValueError(f"未知状态: {v!r}")
        return v


class ApplicationEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    application_id: str
    event_type: str
    from_status: str
    to_status: str
    note: str
    occurred_at: datetime


class ApplicationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    profile_id: str
    job_id: str
    resume_version_id: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime
    events: list[ApplicationEventRead] = Field(default_factory=list)


class InterviewPlanCreate(BaseModel):
    application_id: str
    topics: list[dict] = Field(default_factory=list)
    questions: list[dict] = Field(default_factory=list)
    progress: int = Field(default=0, ge=0, le=100)


class InterviewPlanRead(InterviewPlanCreate):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: datetime


class TransitionCheck(BaseModel):
    """状态机校验请求（供 API 与测试复用）。"""

    from_status: str
    to_status: str

    @field_validator("from_status", "to_status")
    @classmethod
    def _valid_status(cls, v: str) -> str:
        if v not in APPLICATION_STATUSES:
            raise ValueError(f"未知状态: {v!r}")
        return v

    def check(self) -> bool:
        validate_transition(self.from_status, self.to_status)
        return True
