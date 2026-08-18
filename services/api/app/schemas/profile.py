"""个人中心 Schemas。"""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class SkillBase(BaseModel):
    name: str = ""
    items: str = ""
    level: str = ""
    evidence_experience_id: str = ""


class SkillCreate(SkillBase):
    pass


class SkillRead(SkillBase):
    model_config = ConfigDict(from_attributes=True)
    id: str


class ExperienceBase(BaseModel):
    type: Literal["education", "internship", "project", "campus", "research", "award", "other"] = "other"
    title: str = ""
    role: str = ""
    organization: str = ""
    start_date: str = ""
    end_date: str = ""
    content: str = ""
    order_index: int = 0
    extra: dict = Field(default_factory=dict)


class ExperienceCreate(ExperienceBase):
    pass


class ExperienceRead(ExperienceBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    profile_id: str


class PreferenceBase(BaseModel):
    roles: list[str] = Field(default_factory=list)
    locations: list[str] = Field(default_factory=list)
    industries: list[str] = Field(default_factory=list)
    job_types: list[str] = Field(default_factory=list)
    salary_expectation: str = ""
    graduate_year: str = ""
    availability: str = ""


class PreferenceRead(PreferenceBase):
    model_config = ConfigDict(from_attributes=True)
    id: str


class ProfileBase(BaseModel):
    display_name: str = ""
    summary: str = ""
    visibility: Literal["public", "shared", "private"] = "private"


class ProfileCreate(ProfileBase):
    # 可选：直接携带 Resume Kit JSON 导入快照
    resume_json: dict | None = None
    experiences: list[ExperienceCreate] = Field(default_factory=list)
    skills: list[SkillCreate] = Field(default_factory=list)
    preference: PreferenceBase | None = None


class ProfileUpdate(BaseModel):
    display_name: str | None = None
    summary: str | None = None
    visibility: Literal["public", "shared", "private"] | None = None


class ProfileRead(ProfileBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: datetime
    updated_at: datetime
    experiences: list[ExperienceRead] = Field(default_factory=list)
    skills: list[SkillRead] = Field(default_factory=list)
    preference: PreferenceRead | None = None
