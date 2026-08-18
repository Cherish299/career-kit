"""个人中心路由：#3 导入 Resume Kit JSON + Profile CRUD。"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_db
from app.models import Preference, Profile
from app.schemas import ProfileCreate, ProfileRead, ProfileUpdate
from app.services.importer import import_resume_kit_json

router = APIRouter()


def _load_profile(db: Session, profile_id: str) -> Profile:
    profile = db.scalar(
        select(Profile)
        .options(selectinload(Profile.experiences), selectinload(Profile.skills), selectinload(Profile.preference))
        .where(Profile.id == profile_id)
    )
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile 不存在")
    return profile


@router.post("", response_model=ProfileRead, status_code=201)
def create_profile(payload: ProfileCreate, db: Session = Depends(get_db)) -> Profile:
    """创建画像；携带 resume_json 时走 Resume Kit 导入（#3）。"""
    if payload.resume_json:
        try:
            profile, warnings = import_resume_kit_json(payload.resume_json)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        if payload.display_name and not profile.display_name:
            profile.display_name = payload.display_name
    else:
        profile = Profile(
            display_name=payload.display_name,
            summary=payload.summary,
            visibility=payload.visibility,
        )
        profile.experiences.extend(payload.experiences)  # type: ignore[attr-defined]
        profile.skills.extend(payload.skills)  # type: ignore[attr-defined]
        if payload.preference:
            profile.preference = Preference(**payload.preference.model_dump())
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return _load_profile(db, profile.id)


@router.get("", response_model=list[ProfileRead])
def list_profiles(db: Session = Depends(get_db)) -> list[Profile]:
    return list(
        db.scalars(
            select(Profile)
            .options(selectinload(Profile.experiences), selectinload(Profile.skills), selectinload(Profile.preference))
            .order_by(Profile.created_at.desc())
        )
    )


@router.get("/{profile_id}", response_model=ProfileRead)
def get_profile(profile_id: str, db: Session = Depends(get_db)) -> Profile:
    return _load_profile(db, profile_id)


@router.patch("/{profile_id}", response_model=ProfileRead)
def update_profile(
    profile_id: str, payload: ProfileUpdate, db: Session = Depends(get_db)
) -> Profile:
    profile = _load_profile(db, profile_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return _load_profile(db, profile_id)
