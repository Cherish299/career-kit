"""Pydantic Schema 校验测试。"""
import pytest
from pydantic import ValidationError

from app.schemas import (
    ApplicationCreate,
    ApplicationStatusUpdate,
    JobCreate,
    ProfileCreate,
    TransitionCheck,
)


def test_profile_create_accepts_valid_visibility():
    p = ProfileCreate(display_name="张三", visibility="private", resume_json={"a": 1})
    assert p.visibility == "private"


def test_profile_create_rejects_bad_visibility():
    with pytest.raises(ValidationError):
        ProfileCreate(display_name="张三", visibility="public-everything")


def test_experience_type_must_be_known():
    from app.schemas import ExperienceCreate

    with pytest.raises(ValidationError):
        ExperienceCreate(type="hobby")


def test_job_source_must_be_known():
    with pytest.raises(ValidationError):
        JobCreate(title="xx", source="rss")


def test_application_status_must_be_known():
    with pytest.raises(ValidationError):
        ApplicationCreate(profile_id="p", job_id="j", status="in_space")


def test_status_update_validates_target():
    with pytest.raises(ValidationError):
        ApplicationStatusUpdate(to_status="no_such_status")


def test_transition_check_validates_and_enforces():
    from app.models import InvalidTransitionError

    assert TransitionCheck(from_status="discovered", to_status="favorited").check() is True
    with pytest.raises(InvalidTransitionError):
        TransitionCheck(from_status="offer", to_status="submitted").check()
