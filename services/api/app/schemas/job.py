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
    status: Literal["active", "closed", "draft"] = "active"


class JobCreate(JobBase):
    company_id: str | None = None
    company_name: str | None = None  # 便捷：录入时按名创建/查找 Company


class JobUpdate(BaseModel):
    title: str | None = None
    location: str | None = None
    requirements: str | None = None
    description: str | None = None
    source_url: str | None = None
    status: Literal["active", "closed", "draft"] | None = None


class JobRead(JobBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    company_id: str | None = None
    created_at: datetime
    updated_at: datetime


class JobSnapshotRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    job_id: str
    content_hash: str
    captured_at: datetime
