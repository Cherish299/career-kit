# CareerOS — 个人求职操作系统

> 以个人职业画像为唯一事实源，打通岗位发现、匹配分析、材料生成、辅助投递、进度跟踪与笔面试准备的一体化求职工作台。

**定位**：CareerOS 不是招聘信息聚合站，也不是无差别批量投递工具。个人信息只维护一次，岗位数据进入统一结构，简历和准备材料按岗位生成，所有投递行为形成可追踪事件。

## 核心能力（路线图）

| 模块 | 能力 | 状态 |
| --- | --- | --- |
| 🎯 **个人中心 Profile Hub** | 统一职业画像、字段级可见性、Resume Kit JSON 导入 | 规划中（P0） |
| 📡 **岗位雷达 Job Radar** | JD/URL 录入、官网采集、去重、可解释匹配 | 规划中（P0/P1） |
| 📄 **材料工作室 Asset Studio** | 岗位定制简历版本、求职信、个人主页 | 规划中（P0/P1） |
| 📨 **投递管线 Application Pipeline** | 状态看板、事件溯源、提醒、统计 | 规划中（P0） |
| 🧠 **面试准备 Interview Kit** | 210 题题库、笔试/面试模拟、JD 定向准备 | ✅ 已有（legacy/interview-kit） |

## 当前状态：第 1 周 · 工程基线（M0）

仓库骨架已建立，现有两个成熟工具已作为 legacy 模块迁入：

- `legacy/resume-kit` — **简历工作台**（6 岗位模板 × 4 风格、A4 预览、规则体检、求职台、可选 AI 优化、DSH 插件）
- `legacy/interview-kit` — **AI 岗刷题**（210 题：机器学习/深度学习/大模型/RAG/Agent/知识图谱/算法/场景/行为，笔试/面试模拟、学习统计、个性化方案、DSH 插件）

两个 legacy 工具均**纯前端、无构建依赖**（Node 即可构建）。统一命令（仓库根目录）：

```bash
npm run build     # 构建两个工具 → legacy/*/dist/*.html（双击即用）
npm run test      # 规则引擎单测 + 题库校验 + DOM 冒烟
npm run dev       # 开发启动（后端骨架就绪后接线）
```

## 路线图

见 [docs/ROADMAP.md](docs/ROADMAP.md)（12 周计划，M0 工程基线 → M1 MVP 闭环 → M2 完整闭环 → M3 公开 v1.0），完整产品计划见 [docs/PLAN.md](docs/PLAN.md)。

## 仓库结构

```
career-kit/
├── apps/                  # 统一 Web 前端（第 2 周起）
├── services/              # FastAPI 后端 / 采集服务（第 2 周起）
├── packages/              # 共享 Schema 与规则引擎（第 2 周起）
├── legacy/                # 现有工具（resume-kit / interview-kit）
└── docs/                  # 计划书与路线图
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
