"""岗位雷达 Schemas。"""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class CompanyBase(BaseModel):
    name: str
    aliases: list[str] = Field(default_factory=list)
    career_site: str = ""
    industry: str = ""


class CompanyCreate(CompanyBase):
    pass


class CompanyRead(CompanyBase):
    model_config = ConfigDict(from_attributes=True)
    id: str


class JobBase(BaseModel):
    title: str = ""
    location: str = ""
    requirements: str = ""
    description: str = ""
    source_url: str = ""
    source: Literal["manual", "url", "crawler"] = "manual"
    external_id: str = ""
    status: Literal["active", "closed", "draft", "stale"] = "active"
    is_favorite: bool = False
    deadline: str = ""


class JobCreate(JobBase):
    company_id: str | None = None
    company_name: str | None = None  # 便捷：录入时按名创建/查找 Company


class JobUpdate(BaseModel):
    title: str | None = None
    location: str | None = None
    requirements: str | None = None
    description: str | None = None
    source_url: str | None = None
    status: Literal["active", "closed", "draft", "stale"] | None = None
    is_favorite: bool | None = None
    deadline: str | None = None


class JobRead(JobBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    company_id: str | None = None
    company_name: str = ""
    created_at: datetime
    updated_at: datetime
    is_favorite: bool
    deadline: str
    last_seen_at: datetime | None = None


class JobSnapshotRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    job_id: str
    content_hash: str
    captured_at: datetime


class JobSnapshotCreate(BaseModel):
    raw_content: str


class JobAlertRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    job_id: str
    type: str
    message: str
    dedupe_key: str = ""
    read_at: datetime | None = None
    created_at: datetime
    job_title: str = ""


class JobAlertUpdate(BaseModel):
    read: bool = True


class JobSyncRow(BaseModel):
    title: str = ""
    location: str = ""
    requirements: str = ""
    description: str = ""
    source_url: str = ""
    source: str = "crawler"
    external_id: str
    company_name: str | None = None
    deadline: str = ""


class JobSyncRequest(BaseModel):
    source: str = "crawler"
    rows: list[JobSyncRow] = Field(default_factory=list)
    stale_missing_favorites: bool = True
    deadline_days: int = 14
    triggered_by: str = "manual"


class JobSyncResponse(BaseModel):
    created: int
    updated: int
    unchanged: int
    closed: int
    alerts_created: int
    run_id: str


class JobSyncRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    source: str
    row_count: int
    created: int
    updated: int
    unchanged: int
    closed: int
    alerts_created: int
    triggered_by: str
    created_at: datetime
