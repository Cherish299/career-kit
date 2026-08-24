"""Interview plan routes: generate a minimal JD-linked preparation plan."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_db
from app.models import Application, InterviewPlan, Job, Profile
from app.schemas import InterviewPlanRead
from app.services.interview_plan import generate_interview_plan

router = APIRouter()


@router.post("/generate", response_model=InterviewPlanRead)
def generate_plan(application_id: str, db: Session = Depends(get_db)) -> InterviewPlan:
    application = db.scalar(
        select(Application)
        .options(selectinload(Application.interview_plan))
        .where(Application.id == application_id)
    )
    if application is None:
        raise HTTPException(status_code=404, detail="投递记录不存在")

    profile = db.get(Profile, application.profile_id)
    job = db.get(Job, application.job_id)
    if profile is None or job is None:
        raise HTTPException(status_code=404, detail="画像或岗位不存在")

    plan = application.interview_plan
    generated = generate_interview_plan(application, profile, job)
    if plan is None:
        plan = generated
        db.add(plan)
    else:
        plan.topics = generated.topics
        plan.questions = generated.questions
        plan.progress = generated.progress

    db.commit()
    db.refresh(plan)
    return plan


@router.get("/{application_id}", response_model=InterviewPlanRead)
def get_plan(application_id: str, db: Session = Depends(get_db)) -> InterviewPlan:
    plan = db.scalar(select(InterviewPlan).where(InterviewPlan.application_id == application_id))
    if plan is None:
        raise HTTPException(status_code=404, detail="面试计划不存在")
    return plan
