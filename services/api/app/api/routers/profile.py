"""个人中心路由：#3 导入 Resume Kit JSON + Profile CRUD。"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_db
from app.models import Experience, Preference, Profile, Skill
from app.schemas import ProfileCreate, ProfileRead, ProfileUpdate, PublicExperienceRead, PublicProfileRead, PublicSkillRead
from app.services.importer import import_resume_kit_json

router = APIRouter()

DEFAULT_PUBLIC_FIELDS = ["display_name", "summary", "skills", "projects"]


def _load_profile(db: Session, profile_id: str) -> Profile:
    profile = db.scalar(
        select(Profile)
        .options(selectinload(Profile.experiences), selectinload(Profile.skills), selectinload(Profile.preference))
        .where(Profile.id == profile_id)
    )
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile 不存在")
    return profile


def _slugify(value: str) -> str:
    text = "".join(ch.lower() if ch.isalnum() else "-" for ch in value.strip())
    slug = "-".join(part for part in text.split("-") if part)
    return slug[:80]


def _ensure_public_slug(profile: Profile) -> None:
    if not profile.public_slug:
        profile.public_slug = _slugify(profile.display_name) or profile.id[:8]
    if not profile.public_fields:
        profile.public_fields = list(DEFAULT_PUBLIC_FIELDS)


def _to_public_profile(profile: Profile) -> PublicProfileRead:
    fields = set(profile.public_fields or DEFAULT_PUBLIC_FIELDS)
    experiences = []
    if "projects" in fields:
        experiences = [
            PublicExperienceRead(
                title=exp.title,
                organization=exp.organization,
                role=exp.role,
                content=exp.content,
                type=exp.type,
            )
            for exp in profile.experiences
            if exp.type in {"project", "internship", "research"}
        ]
    skills = []
    if "skills" in fields:
        skills = [PublicSkillRead(name=skill.name, items=skill.items, level=skill.level) for skill in profile.skills]
    return PublicProfileRead(
        display_name=profile.display_name if "display_name" in fields else "",
        summary=profile.summary if "summary" in fields else "",
        public_slug=profile.public_slug,
        roles=list(profile.preference.roles) if profile.preference else [],
        experiences=experiences,
        skills=skills,
    )


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
        if payload.public_slug:
            profile.public_slug = payload.public_slug
        if payload.public_fields:
            profile.public_fields = payload.public_fields
    else:
        profile = Profile(
            display_name=payload.display_name,
            summary=payload.summary,
            visibility=payload.visibility,
            public_slug=payload.public_slug,
            public_fields=payload.public_fields or list(DEFAULT_PUBLIC_FIELDS),
        )
        profile.experiences.extend(Experience(**item.model_dump()) for item in payload.experiences)
        profile.skills.extend(Skill(**item.model_dump()) for item in payload.skills)
        if payload.preference:
            profile.preference = Preference(**payload.preference.model_dump())
    _ensure_public_slug(profile)
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


@router.get("/public/{slug}", response_model=PublicProfileRead)
def get_public_profile(slug: str, db: Session = Depends(get_db)) -> PublicProfileRead:
    profile = db.scalar(
        select(Profile)
        .options(
            selectinload(Profile.experiences),
            selectinload(Profile.skills),
            selectinload(Profile.preference),
        )
        .where(Profile.public_slug == slug, Profile.visibility.in_(["public", "shared"]))
    )
    if profile is None:
        raise HTTPException(status_code=404, detail="公开主页不存在")
    return _to_public_profile(profile)


@router.get("/{profile_id}", response_model=ProfileRead)
def get_profile(profile_id: str, db: Session = Depends(get_db)) -> Profile:
    return _load_profile(db, profile_id)


@router.patch("/{profile_id}", response_model=ProfileRead)
def update_profile(
    profile_id: str, payload: ProfileUpdate, db: Session = Depends(get_db)
) -> Profile:
    profile = _load_profile(db, profile_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "public_slug" and value:
            value = _slugify(value)
        setattr(profile, field, value)
    _ensure_public_slug(profile)
    db.commit()
    db.refresh(profile)
    return _load_profile(db, profile_id)
