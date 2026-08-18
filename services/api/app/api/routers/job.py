"""岗位雷达路由：#4 JD 文本/URL 录入 + Job CRUD。"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models import Company, Job
from app.schemas import JobCreate, JobRead, JobUpdate

router = APIRouter()


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


@router.post("", response_model=JobRead, status_code=201)
def create_job(payload: JobCreate, db: Session = Depends(get_db)) -> Job:
    """录入岗位：JD 文本（description/requirements）或 URL（source_url）。"""
    job = Job(
        title=payload.title,
        location=payload.location,
        requirements=payload.requirements,
        description=payload.description,
        source_url=payload.source_url,
        source=payload.source,
        external_id=payload.external_id,
        status=payload.status,
    )
    if payload.company_name and not payload.company_id:
        company = _get_or_create_company(db, payload.company_name)
        if company:
            job.company_id = company.id
    else:
        job.company_id = payload.company_id
    db.add(job)
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
    db.commit()
    db.refresh(job)
    return job
