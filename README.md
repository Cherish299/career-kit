# CareerOS — 个人求职操作系统

> 以个人职业画像为唯一事实源，打通岗位发现、匹配分析、材料生成、辅助投递、进度跟踪与笔面试准备的一体化求职工作台。

**定位**：CareerOS 不是招聘信息聚合站，也不是无差别批量投递工具。个人信息只维护一次，岗位数据进入统一结构，简历和准备材料按岗位生成，所有投递行为形成可追踪事件。

## 核心能力（路线图）

| 模块 | 能力 | 状态 |
| --- | --- | --- |
| 🎯 **个人中心 Profile Hub** | 统一职业画像、Resume Kit JSON 导入、基础隐私级别 | ✅ MVP 可用 |
| 📡 **岗位雷达 Job Radar** | JD/URL 录入、官网采集预览、去重、收藏、截止日期、同步提醒 | ✅ 第 6 周最小闭环已落地 |
| 📄 **材料工作室 Asset Studio** | 岗位定制简历版本、求职信、个人主页 | 🔄 简历副本与公开主页 API 已落地 |
| 📨 **投递管线 Application Pipeline** | 状态看板、事件溯源、提醒、统计 | 🔄 状态机已完成，统计待补 |
| 🧠 **面试准备 Interview Kit** | 152 题题库、笔试/面试模拟、JD 定向准备 | 🔄 已接入 JD 规则映射与准备计划生成 |

## 当前状态：M1 已可演示，M2 已补到最小可运行闭环

当前仓库已经能完成样例级闭环：`画像导入 → 岗位录入/采集预览 → 匹配分析 → 简历副本 → 投递状态机 → JD 定向面试准备`。
目前第 6-8 周已落地的最小能力包括：岗位同步提醒、公开主页只读 API、JD 关联面试准备计划；仍待继续补共享包、完整公开页、题库深度联动与发布物。

现有两个成熟工具已作为 legacy 模块迁入：

- `legacy/resume-kit` — **简历工作台**（6 岗位模板 × 4 风格、A4 预览、规则体检、求职台、可选 AI 优化、DSH 插件）
- `legacy/interview-kit` — **AI 岗刷题**（152 题：机器学习/深度学习/大模型/RAG/Agent/知识图谱/算法/场景/行为，笔试/面试模拟、学习统计、个性化方案、DSH 插件）
- `services/api/alembic/versions/46f046296328_initial_careeros_schema.py` — **首个数据库迁移**（覆盖当前 CareerOS 核心表结构）

两个 legacy 工具均**纯前端、无构建依赖**（Node 即可构建）。统一命令（仓库根目录）：

```bash
npm run build     # 构建两个工具 → legacy/*/dist/*.html（双击即用）
npm run test      # legacy + crawler + API 集成测试 + DOM 冒烟
```

## 快速开始（MVP 工作台：后端 + 前端一体）

推荐在 Windows PowerShell 中使用 Python 模块方式启动，避免 `uvicorn` 命令未加入 PATH：

```powershell
cd services/api
python -m pip install -e ".[dev]"
$env:CAREER_DATABASE_URL="sqlite:///./dev.db"
python -m pytest
python -m uvicorn app.main:app --reload
```

也可以从仓库根目录启动：

```powershell
$env:CAREER_DATABASE_URL="sqlite:///./services/api/dev.db"
npm run dev
```

浏览器打开 <http://127.0.0.1:8000>，用 `examples/sample-resume.json` 导入画像、`examples/sample-jobs.json` 录入岗位，即可体验完整闭环：**画像 → 岗位 → 匹配报告 → 投递看板 → 简历副本 → 面试准备计划**。

公开主页使用方式：

- 在“个人中心”选择一个画像
- 设置 `visibility` 为 `shared` 或 `public`
- 配置 `public slug` 与公开字段复选框
- 点击“保存公开设置”后，可直接打开 `/public/{slug}` 或复制分享链接

> 生产数据库：仓库根目录 `docker compose up -d` 启动 PostgreSQL。

## 当前已落地的增量

- `services/api/app/api/routers/job.py`：岗位收藏、deadline、stale、sync、alerts、sync runs
- `services/api/app/api/routers/profile.py`：公开主页 slug、字段白名单、只读 public API
- `services/api/app/api/routers/interview.py`：JD 关联面试准备计划生成与读取
- `services/api/alembic/versions/46f046296328_initial_careeros_schema.py`：初始迁移
- `services/api/alembic/versions/50de55dfebe4_add_job_alerts_and_sync_fields.py`：提醒迁移
- `services/api/alembic/versions/6f6f4f975f1f_add_job_sync_runs_and_alert_dedupe.py`：同步日志与提醒去重迁移
- `services/api/alembic/versions/8f8db1afcb51_add_public_profile_fields.py`：公开主页字段迁移

## 路线图

见 [docs/ROADMAP.md](docs/ROADMAP.md)（12 周计划，M0 工程基线 → M1 MVP 闭环 → M2 完整闭环 → M3 公开 v1.0），完整产品计划见 [docs/PLAN.md](docs/PLAN.md)。

## 仓库结构

```
career-kit/
├── apps/web              # 统一 Web 工作台（原生 JS MVP，规划迁移 React）
├── services/api          # FastAPI 后端（Schema/CRUD/匹配/状态机/公开主页/面试计划，35 项测试）
├── services/crawler      # 官网采集（第 5 周起）
├── packages/             # 共享包（profile-schema / resume-engine / job-matcher / interview-kit）
├── legacy/               # 现有工具（resume-kit / interview-kit）
├── examples/             # 匿名样例数据（画像 / 岗位）
└── docs/                 # 计划书与路线图
```

## 贡献

- 先读 [docs/PLAN.md](docs/PLAN.md) 了解范围与里程碑
- 提交信息使用 `feat:` / `fix:` / `test:` / `docs:` / `chore:` 前缀
- 不提交：node_modules、构建产物、个人绝对路径、密钥与真实个人数据

## 许可证

[MIT](LICENSE)

## 免责声明

- 本项目仅提供求职辅助工具，不保证录取结果；AI 生成内容需用户人工确认
- 公开 Demo 与样例数据均经过匿名化；请勿在公开仓库提交真实个人信息与投递数据
