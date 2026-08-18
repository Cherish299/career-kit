"""匹配路由：#5 可解释匹配报告。"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_db
from app.models import Job, MatchReport, Preference, Profile
from app.schemas import MatchReportCreate, MatchReportRead
from app.services.matcher import analyze_match

router = APIRouter()


@router.post("/analyze", response_model=MatchReportRead)
def analyze(profile_id: str, job_id: str, db: Session = Depends(get_db)) -> MatchReport:
    """对 Profile × Job 运行确定性规则匹配，输出可解释报告并落库。"""
    profile = db.scalar(
        select(Profile)
        .options(selectinload(Profile.experiences), selectinload(Profile.skills), selectinload(Profile.preference))
        .where(Profile.id == profile_id)
    )
    job = db.get(Job, job_id)
    if profile is None or job is None:
        raise HTTPException(status_code=404, detail="Profile 或 Job 不存在")

    report = analyze_match(profile, profile.preference, job)
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.post("", response_model=MatchReportRead, status_code=201)
def save_report(payload: MatchReportCreate, db: Session = Depends(get_db)) -> MatchReport:
    """手动保存匹配报告（解析/打分结果归档）。"""
    report = MatchReport(**payload.model_dump())
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("/{report_id}", response_model=MatchReportRead)
def get_report(report_id: str, db: Session = Depends(get_db)) -> MatchReport:
    report = db.get(MatchReport, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="匹配报告不存在")
    return report


@router.get("", response_model=list[MatchReportRead])
def list_reports(job_id: str | None = None, db: Session = Depends(get_db)) -> list[MatchReport]:
    stmt = select(MatchReport).order_by(MatchReport.created_at.desc())
    if job_id:
        stmt = stmt.where(MatchReport.job_id == job_id)
    return list(db.scalars(stmt))
