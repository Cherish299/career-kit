"""简历版本路由：#6 岗位定制简历副本（不覆盖母版）。"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models import ResumeVersion
from app.schemas import ResumeVersionCreate, ResumeVersionRead

router = APIRouter()


@router.post("", response_model=ResumeVersionRead, status_code=201)
def create_resume_version(
    payload: ResumeVersionCreate, db: Session = Depends(get_db)
) -> ResumeVersion:
    """创建简历版本；parent_id 指向母版（为空表示母版本体）。"""
    version = ResumeVersion(**payload.model_dump())
    db.add(version)
    db.commit()
    db.refresh(version)
    return version


@router.post("/{source_id}/fork", response_model=ResumeVersionRead, status_code=201)
def fork_resume_version(
    source_id: str, job_id: str | None = None, name: str = "", db: Session = Depends(get_db)
) -> ResumeVersion:
    """基于已有版本复制为岗位定制副本（内容拷贝，parent 指向源版本）。"""
    source = db.get(ResumeVersion, source_id)
    if source is None:
        raise HTTPException(status_code=404, detail="母版不存在")
    version = ResumeVersion(
        profile_id=source.profile_id,
        job_id=job_id,
        parent_id=source.id,
        name=name or f"{source.name} 副本",
        content=source.content,
        template_id=source.template_id,
        style=source.style,
    )
    db.add(version)
    db.commit()
    db.refresh(version)
    return version


@router.get("", response_model=list[ResumeVersionRead])
def list_resume_versions(
    profile_id: str | None = None, job_id: str | None = None, db: Session = Depends(get_db)
) -> list[ResumeVersion]:
    stmt = select(ResumeVersion).order_by(ResumeVersion.created_at.desc())
    if profile_id:
        stmt = stmt.where(ResumeVersion.profile_id == profile_id)
    if job_id:
        stmt = stmt.where(ResumeVersion.job_id == job_id)
    return list(db.scalars(stmt))


@router.get("/{version_id}", response_model=ResumeVersionRead)
def get_resume_version(version_id: str, db: Session = Depends(get_db)) -> ResumeVersion:
    version = db.get(ResumeVersion, version_id)
    if version is None:
        raise HTTPException(status_code=404, detail="简历版本不存在")
    return version
