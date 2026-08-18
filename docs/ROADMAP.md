# CareerOS 路线图与里程碑跟踪

完整产品计划见 [PLAN.md](PLAN.md)。本文件为执行跟踪视图。

## 里程碑

| 里程碑 | 名称 | 目标日期 | 状态 |
| --- | --- | --- | --- |
| M0 | 工程基线 | 第 1 周周末 | 🔄 进行中（Day 1 已启动） |
| M1 | MVP 闭环 | 第 4 周周末 | ⏳ |
| M2 | 完整求职闭环 | 第 8 周周末 | ⏳ |
| M3 | 公开发布 v1.0 | 第 12 周周末 | ⏳ |

## 12 周路线图

- [ ] **第 1 周 · 仓库与数据基线**：清理仓库；统一项目壳；Profile/Job/Application Schema；样例数据（→ M0）
- [ ] **第 2 周 · 个人中心**：画像编辑、Resume Kit JSON 迁移、隐私字段、API
- [ ] **第 3 周 · 岗位录入与匹配 v0**：JD/URL 入口、结构化解析、硬条件+关键词匹配、解释页面
- [ ] **第 4 周 · 简历版本与投递看板**：岗位简历副本、Application 状态机+事件、端到端演示（→ M1）
- [ ] **第 5 周 · 官网采集框架**：Source Adapter、接入 2 个官方招聘源
- [ ] **第 6 周 · 岗位更新与提醒**：内容哈希、去重、下架检测、收藏筛选
- [ ] **第 7 周 · 个人主页**：公开字段白名单、方向主页、分享链接、移动端
- [ ] **第 8 周 · 面试准备联动**：接入题库、JD 主题映射、复习计划（→ M2）
- [ ] **第 9 周 · 辅助填表原型**：浏览器扩展字段映射、自动填充、不自动提交
- [ ] **第 10 周 · 投递状态增强**：提醒、面试日程、状态统计
- [ ] **第 11 周 · 质量与安全**：性能、隐私、依赖审计、E2E、部署演练
- [ ] **第 12 周 · 开源发布**：README、架构文档、Demo 视频、Release（→ M3）

## 第 1 周（M0）开工清单

- [x] **Day 1 仓库卫生**：新建 career-kit 仓库基线；legacy 迁入；.gitignore/LICENSE/README；清理个人路径与中文产物名
- [x] **Day 2 统一工程**：apps/services/packages 目录与说明；根级统一 build/test 命令（`npm run build` / `npm run test`）；CI 接入统一命令
- [ ] **Day 3 Schema**：Profile/Experience/Skill/Preference/Job/Application；Pydantic 模型与数据库迁移
- [ ] **Day 4 后端骨架**：FastAPI 健康检查；Profile/Job/Application CRUD；Docker Compose 起 PostgreSQL
- [ ] **Day 5 前端骨架**：统一导航、个人中心空态、岗位列表、投递看板；接通真实 API
- [ ] **Day 6 迁移与测试**：resume JSON 导入；Schema/迁移/状态流转单测；匿名样例数据
- [ ] **Day 7 验收与复盘**：干净环境按 README 启动；2 分钟演示；问题清单

## 现有资产（legacy）清单

| 模块 | 位置 | 能力 | 测试 |
| --- | --- | --- | --- |
| 简历工作台 | `legacy/resume-kit` | 简历编辑/模板/预览/体检/求职台/AI 优化 | `node scripts/test-engine.js` |
| AI 刷题 | `legacy/interview-kit` | 210 题题库/笔试面试模拟/统计/个性化方案 | `node scripts/test-data.js` |

两个模块的构建：`node scripts/build.js`（纯 Node，无依赖），产物为单文件 HTML（`resume-workbench.html` / `interview-kit.html`）。
