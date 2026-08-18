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
docker compose up -d        # 仓库根目录：启动 PostgreSQL
alembic upgrade head        # 迁移（需 PostgreSQL）
uvicorn app.main:app --reload  # 启动 API（http://127.0.0.1:8000/api/health）
```

## API 端点（MVP）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查 |
| POST/GET/PATCH | `/api/profiles`、`/api/profiles/{id}` | 画像 CRUD；POST 携带 `resume_json` 即触发 **Resume Kit JSON 导入**（#3） |
| POST/GET/PATCH | `/api/jobs`、`/api/jobs/{id}` | 岗位录入（JD 文本/URL）与 CRUD（#4） |
| POST | `/api/matches/analyze?profile_id=&job_id=` | 规则匹配（硬条件+关键词）输出可解释报告（#5） |
| POST/GET | `/api/resume-versions`、`/{id}/fork` | 简历版本与岗位定制副本（#6） |
| POST/GET/PATCH | `/api/applications`、`/{id}/status` | 投递看板：状态机校验 + 事件溯源（#7） |
