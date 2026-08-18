"""SQLAlchemy 声明基类与模型汇总（Alembic 与 create_all 共用）。"""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# 导入全部模型，确保元数据完整（Alembic autogenerate / create_all 依赖）
from app.models import (  # noqa: E402,F401
    Application,
    ApplicationEvent,
    Company,
    Experience,
    InterviewPlan,
    Job,
    JobSnapshot,
    MatchReport,
    Preference,
    Profile,
    ResumeVersion,
    Skill,
)
