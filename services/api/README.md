# services/api — FastAPI 后端

CareerOS 的 API 服务。

## 技术栈

Python + FastAPI + Pydantic v2 + SQLAlchemy 2.0 + Alembic + PostgreSQL（开发期 Docker Compose；测试用 SQLite 内存库）。

## 结构

```
services/api/
├── app/
│   ├── core/config.py      # 环境变量配置（CAREER_DATABASE_URL 等）
│   ├── db/                 # Base 元数据 + engine/session
│   ├── models/             # SQLAlchemy ORM（12 个实体 + Application 状态机）
│   └── schemas/            # Pydantic 校验模型（API 契约）
├── alembic/                # 数据库迁移（env.py 已接模型元数据）
└── tests/                  # pytest：模型 / 状态机 / Schema 校验（19 项）
```

## 核心 Schema（对齐计划书）

- **profiles**：个人画像主记录（含 resume_json 原始导入快照 + visibility 字段级可见性）
- **experiences / skills / preferences**：画像结构化数据（兼容 Resume Kit JSON 迁移）
- **companies / jobs / job_snapshots**：岗位雷达（来源/去重/变更快照）
- **match_reports**：可解释匹配（分层分数 + 证据 + 硬条件阻塞标记）
- **resume_versions**：岗位定制简历（parent_id 指向母版，不覆盖）
- **applications / application_events**：投递状态机 + 事件溯源（只追加）
- **interview_plans**：JD 定向面试准备

**Application 状态机**：发现 → 收藏 → 待投递 → 已投递 → 笔试 → 一面 → 后续面试 → Offer/拒绝/放弃；非法流转抛 `InvalidTransitionError`（见 `app/models/application.py`）。

## 开发

```bash
pip install -e ".[dev]"     # 安装依赖
python -m pytest            # 跑测试（SQLite，无需数据库）
alembic upgrade head        # 迁移（需 PostgreSQL，Day 4 起）
```
