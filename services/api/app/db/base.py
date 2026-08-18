"""SQLAlchemy 声明基类。

模型注册：`Base.metadata` 需要模型模块被导入才会收集表结构。
入口处（app.main / alembic env.py / 测试 conftest）显式 `import app.models` 触发。
"""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
