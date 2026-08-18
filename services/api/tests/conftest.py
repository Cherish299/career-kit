"""测试共用 fixture：SQLite 内存库（不依赖 PostgreSQL）。"""
import os

# 必须在 import app.* 之前设置：全局 engine（lifespan create_all）走 SQLite 内存库
os.environ.setdefault("CAREER_DATABASE_URL", "sqlite://")

import pytest  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

import app.models  # noqa: E402,F401  # 注册全部模型到 Base.metadata
from app.db.base import Base  # noqa: E402


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, expire_on_commit=False)
    session = Session()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()
