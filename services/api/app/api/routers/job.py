"""岗位雷达路由：#4 JD 文本/URL 录入 + Job CRUD。"""
from __future__ import annotations

import hashlib
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models import Company, Job, JobAlert, JobSnapshot
from app.schemas import (
    JobAlertRead,
    JobAlertUpdate,
    JobCreate,
    JobRead,
    JobSnapshotCreate,
    JobSnapshotRead,
    JobSyncRequest,
    JobSyncResponse,
    JobUpdate,
)

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


def _job_raw_content(job: Job) -> str:
    return "\n\n".join(part.strip() for part in [job.title, job.location, job.requirements, job.description, job.deadline] if part and part.strip())


def _payload_raw_content(payload: JobCreate) -> str:
    return "\n\n".join(part.strip() for part in [payload.title, payload.location, payload.requirements, payload.description, payload.deadline] if part and part.strip())


def _create_alert(db: Session, job: Job, alert_type: str, message: str) -> JobAlert:
    alert = JobAlert(job_id=job.id, type=alert_type, message=message)
    db.add(alert)
    return alert


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
        # Crawler upserts must not erase a user's favorite flag or an existing deadline.
        if payload.deadline:
            existing.deadline = payload.deadline
        existing.last_seen_at = datetime.now(timezone.utc)
        _maybe_add_snapshot(db, existing, _payload_raw_content(payload))
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
        is_favorite=payload.is_favorite,
        deadline=payload.deadline,
        status=payload.status,
        last_seen_at=datetime.now(timezone.utc),
        company_id=_resolve_company_id(db, payload.company_id, payload.company_name),
    )
    db.add(job)
    db.flush()
    _maybe_add_snapshot(db, job, _payload_raw_content(payload))
    db.commit()
    db.refresh(job)
    return job


@router.get("", response_model=list[JobRead])
def list_jobs(
    status: str | None = None,
    favorite: bool | None = None,
    include_stale: bool = True,
    db: Session = Depends(get_db),
) -> list[Job]:
    stmt = select(Job).order_by(Job.created_at.desc())
    if status:
        stmt = stmt.where(Job.status == status)
    if favorite is True:
        stmt = stmt.where(Job.is_favorite.is_(True))
    if not include_stale:
        stmt = stmt.where(Job.status != "stale")
    return list(db.scalars(stmt))


@router.get("/alerts", response_model=list[JobAlertRead])
def list_job_alerts(unread_only: bool = False, db: Session = Depends(get_db)) -> list[JobAlertRead]:
    stmt = select(JobAlert).order_by(JobAlert.created_at.desc())
    if unread_only:
        stmt = stmt.where(JobAlert.read_at.is_(None))
    alerts = list(db.scalars(stmt))
    return [
        JobAlertRead(
            id=alert.id,
            job_id=alert.job_id,
            type=alert.type,
            message=alert.message,
            read_at=alert.read_at,
            created_at=alert.created_at,
            job_title=alert.job.title if alert.job else "",
        )
        for alert in alerts
    ]


@router.patch("/alerts/{alert_id}", response_model=JobAlertRead)
def mark_job_alert(alert_id: str, payload: JobAlertUpdate, db: Session = Depends(get_db)) -> JobAlertRead:
    alert = db.get(JobAlert, alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail="提醒不存在")
    alert.read_at = datetime.now(timezone.utc) if payload.read else None
    db.commit()
    db.refresh(alert)
    return JobAlertRead(
        id=alert.id,
        job_id=alert.job_id,
        type=alert.type,
        message=alert.message,
        read_at=alert.read_at,
        created_at=alert.created_at,
        job_title=alert.job.title if alert.job else "",
    )


@router.post("/sync", response_model=JobSyncResponse)
def sync_jobs(payload: JobSyncRequest, db: Session = Depends(get_db)) -> JobSyncResponse:
    now = datetime.now(timezone.utc)
    created = updated = unchanged = closed = alerts_created = 0
    seen_external_ids: set[str] = set()

    for row in payload.rows:
        external_id = row.external_id.strip()
        if not external_id or external_id in seen_external_ids:
            continue
        seen_external_ids.add(external_id)
        incoming = JobCreate(**{**row.model_dump(exclude={"source"}), "source": payload.source})
        existing = _find_existing_job(db, incoming)
        raw_content = _payload_raw_content(incoming)
        content_hash = _snapshot_hash(raw_content) if raw_content else ""
        if existing is None:
            job = Job(
                title=incoming.title,
                location=incoming.location,
                requirements=incoming.requirements,
                description=incoming.description,
                source_url=incoming.source_url,
                source=incoming.source,
                external_id=incoming.external_id,
                deadline=incoming.deadline,
                status="active",
                last_seen_at=now,
                company_id=_resolve_company_id(db, incoming.company_id, incoming.company_name),
            )
            db.add(job)
            db.flush()
            _maybe_add_snapshot(db, job, raw_content)
            created += 1
            continue

        previous_hash = _snapshot_hash(_job_raw_content(existing)) if _job_raw_content(existing) else ""
        existing.company_id = _resolve_company_id(db, incoming.company_id, incoming.company_name)
        existing.title = incoming.title
        existing.location = incoming.location
        existing.requirements = incoming.requirements
        existing.description = incoming.description
        existing.source_url = incoming.source_url
        if incoming.deadline:
            existing.deadline = incoming.deadline
        existing.status = "active"
        existing.last_seen_at = now

        if content_hash and previous_hash == content_hash:
            unchanged += 1
            continue

        _maybe_add_snapshot(db, existing, raw_content)
        updated += 1
        _create_alert(db, existing, "updated", f"岗位「{existing.title}」内容已更新")
        alerts_created += 1
        if incoming.deadline:
            _create_alert(db, existing, "deadline", f"岗位「{existing.title}」截止日期：{incoming.deadline}")
            alerts_created += 1

    if payload.stale_missing_favorites:
        favorite_jobs = list(db.scalars(select(Job).where(Job.source == payload.source, Job.is_favorite.is_(True))))
        for job in favorite_jobs:
            if job.external_id and job.external_id not in seen_external_ids and job.status != "closed":
                job.status = "closed"
                closed += 1
                _create_alert(db, job, "closed", f"收藏岗位「{job.title}」本次同步未出现，已标记为 closed")
                alerts_created += 1

    db.commit()
    return JobSyncResponse(created=created, updated=updated, unchanged=unchanged, closed=closed, alerts_created=alerts_created)


@router.get("/{job_id}", response_model=JobRead)
def get_job(job_id: str, db: Session = Depends(get_db)) -> Job:
    job = db.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="岗位不存在")
    return job


@router.patch("/{job_id}/favorite", response_model=JobRead)
def toggle_job_favorite(job_id: str, db: Session = Depends(get_db)) -> Job:
    job = db.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="岗位不存在")
    job.is_favorite = not job.is_favorite
    db.commit()
    db.refresh(job)
    return job


@router.post("/mark-stale", response_model=dict)
def mark_stale_jobs(max_age_hours: int = 168, db: Session = Depends(get_db)) -> dict:
    """将超过 max_age_hours 未见的采集岗位标记为 stale；人工岗位不参与。"""
    cutoff = datetime.now(timezone.utc).timestamp() - max_age_hours * 3600
    jobs = list(db.scalars(select(Job).where(Job.source == "crawler", Job.status == "active")))
    changed = 0
    for job in jobs:
        seen = job.last_seen_at or job.updated_at or job.created_at
        if seen and seen.timestamp() < cutoff:
            job.status = "stale"
            changed += 1
    db.commit()
    return {"changed": changed, "checked": len(jobs), "max_age_hours": max_age_hours}


@router.patch("/{job_id}", response_model=JobRead)
def update_job(job_id: str, payload: JobUpdate, db: Session = Depends(get_db)) -> Job:
    job = db.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="岗位不存在")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(job, field, value)
    snapshot_source = _job_raw_content(job)
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
