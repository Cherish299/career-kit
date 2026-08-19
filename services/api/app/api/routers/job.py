"""岗位雷达路由：#4 JD 文本/URL 录入 + Job CRUD。"""
from __future__ import annotations

import hashlib

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models import Company, Job, JobSnapshot
from app.schemas import JobCreate, JobRead, JobSnapshotCreate, JobSnapshotRead, JobUpdate

router = APIRouter()


def _snapshot_hash(raw_content: str) -> str:
    return hashlib.sha256(raw_content.strip().encode("utf-8")).hexdigest()


def _maybe_add_snapshot(db: Session, job: Job, raw_content: str) -> JobSnapshot | None:
    raw_content = raw_content.strip()
    if not raw_content:
        return None
    content_hash = _snapshot_hash(raw_content)
    snapshot = db.scalar(
        select(JobSnapshot).where(JobSnapshot.job_id == job.id, JobSnapshot.content_hash == content_hash)
    )
    if snapshot is not None:
        return snapshot
    snapshot = JobSnapshot(job_id=job.id, content_hash=content_hash, raw_content=raw_content)
    db.add(snapshot)
    return snapshot


def _get_or_create_company(db: Session, name: str) -> Company | None:
    name = name.strip()
    if not name:
        return None
    company = db.scalar(select(Company).where(Company.name == name))
    if company is None:
        company = Company(name=name)
        db.add(company)
        db.flush()
    return company


def _resolve_company_id(db: Session, company_id: str | None, company_name: str | None) -> str | None:
    if company_name and not company_id:
        company = _get_or_create_company(db, company_name)
        if company:
            return company.id
    return company_id


def _find_existing_job(db: Session, payload: JobCreate) -> Job | None:
    external_id = payload.external_id.strip()
    if not external_id:
        return None
    return db.scalar(select(Job).where(Job.source == payload.source, Job.external_id == external_id))


@router.post("", response_model=JobRead, status_code=201)
def create_job(payload: JobCreate, db: Session = Depends(get_db)) -> Job:
    """录入岗位：JD 文本（description/requirements）或 URL（source_url）。"""
    existing = _find_existing_job(db, payload)
    if existing is not None:
        existing.company_id = _resolve_company_id(db, payload.company_id, payload.company_name)
        existing.title = payload.title
        existing.location = payload.location
        existing.requirements = payload.requirements
        existing.description = payload.description
        existing.source_url = payload.source_url
        existing.status = payload.status
        _maybe_add_snapshot(db, existing, payload.description or payload.requirements)
        db.commit()
        db.refresh(existing)
        return existing

    job = Job(
        title=payload.title,
        location=payload.location,
        requirements=payload.requirements,
        description=payload.description,
        source_url=payload.source_url,
        source=payload.source,
        external_id=payload.external_id,
        status=payload.status,
        company_id=_resolve_company_id(db, payload.company_id, payload.company_name),
    )
    db.add(job)
    db.flush()
    _maybe_add_snapshot(db, job, payload.description or payload.requirements)
    db.commit()
    db.refresh(job)
    return job


@router.get("", response_model=list[JobRead])
def list_jobs(status: str | None = None, db: Session = Depends(get_db)) -> list[Job]:
    stmt = select(Job).order_by(Job.created_at.desc())
    if status:
        stmt = stmt.where(Job.status == status)
    return list(db.scalars(stmt))


@router.get("/{job_id}", response_model=JobRead)
def get_job(job_id: str, db: Session = Depends(get_db)) -> Job:
    job = db.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="岗位不存在")
    return job


@router.patch("/{job_id}", response_model=JobRead)
def update_job(job_id: str, payload: JobUpdate, db: Session = Depends(get_db)) -> Job:
    job = db.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="岗位不存在")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(job, field, value)
    snapshot_source = payload.description or payload.requirements
    if snapshot_source is not None:
        _maybe_add_snapshot(db, job, snapshot_source)
    db.commit()
    db.refresh(job)
    return job


@router.get("/{job_id}/snapshots", response_model=list[JobSnapshotRead])
def list_job_snapshots(job_id: str, db: Session = Depends(get_db)) -> list[JobSnapshot]:
    job = db.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="岗位不存在")
    stmt = select(JobSnapshot).where(JobSnapshot.job_id == job_id).order_by(JobSnapshot.captured_at.desc())
    return list(db.scalars(stmt))


@router.post("/{job_id}/snapshots", response_model=JobSnapshotRead, status_code=201)
def create_job_snapshot(job_id: str, payload: JobSnapshotCreate, db: Session = Depends(get_db)) -> JobSnapshot:
    job = db.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="岗位不存在")
    snapshot = _maybe_add_snapshot(db, job, payload.raw_content)
    if snapshot is None:
        raise HTTPException(status_code=422, detail="快照内容不能为空")
    db.commit()
    db.refresh(snapshot)
    return snapshot
