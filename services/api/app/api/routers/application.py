"""投递管线路由：#7 投递看板（状态机 + 事件溯源）。"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_db
from app.models import (
    APPLICATION_STATUS_DISPLAY,
    Application,
    ApplicationEvent,
    InvalidTransitionError,
    validate_transition,
)
from app.schemas import ApplicationCreate, ApplicationRead, ApplicationStatusUpdate

router = APIRouter()


def _load(db: Session, application_id: str) -> Application:
    app = db.scalar(
        select(Application)
        .options(selectinload(Application.events), selectinload(Application.interview_plan))
        .where(Application.id == application_id)
    )
    if app is None:
        raise HTTPException(status_code=404, detail="投递记录不存在")
    return app


@router.post("", response_model=ApplicationRead, status_code=201)
def create_application(
    payload: ApplicationCreate, db: Session = Depends(get_db)
) -> Application:
    app = Application(
        profile_id=payload.profile_id,
        job_id=payload.job_id,
        resume_version_id=payload.resume_version_id,
        status=payload.status,
    )
    app.events.append(
        ApplicationEvent(
            event_type="status_change",
            from_status="",
            to_status=payload.status,
            note="创建投递",
        )
    )
    db.add(app)
    db.commit()
    return _load(db, app.id)


@router.get("", response_model=list[ApplicationRead])
def list_applications(
    profile_id: str | None = None, status: str | None = None, db: Session = Depends(get_db)
) -> list[Application]:
    stmt = select(Application).order_by(Application.updated_at.desc())
    if profile_id:
        stmt = stmt.where(Application.profile_id == profile_id)
    if status:
        stmt = stmt.where(Application.status == status)
    apps = list(db.scalars(stmt))
    return [_load(db, a.id) for a in apps]


@router.get("/{application_id}", response_model=ApplicationRead)
def get_application(application_id: str, db: Session = Depends(get_db)) -> Application:
    return _load(db, application_id)


@router.patch("/{application_id}/status", response_model=ApplicationRead)
def update_status(
    application_id: str, payload: ApplicationStatusUpdate, db: Session = Depends(get_db)
) -> Application:
    """状态转换：状态机校验合法性，事件只追加不覆盖。"""
    app = _load(db, application_id)
    try:
        validate_transition(app.status, payload.to_status)
    except InvalidTransitionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    app.events.append(
        ApplicationEvent(
            event_type="status_change",
            from_status=app.status,
            to_status=payload.to_status,
            note=f"{APPLICATION_STATUS_DISPLAY.get(app.status, app.status)} → {APPLICATION_STATUS_DISPLAY.get(payload.to_status, payload.to_status)}",
        )
    )
    app.status = payload.to_status
    db.commit()
    return _load(db, application_id)


@router.delete("/{application_id}", status_code=204)
def delete_application(application_id: str, db: Session = Depends(get_db)) -> None:
    app = db.get(Application, application_id)
    if app is None:
        raise HTTPException(status_code=404, detail="投递记录不存在")
    db.delete(app)
    db.commit()
