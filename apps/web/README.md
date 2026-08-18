# apps/web — 统一前端

CareerOS 工作台前端（MVP：原生 JS 单页，零构建依赖，直接对接 FastAPI）。

## 当前能力

- 👤 **个人中心**：粘贴/上传 Resume Kit JSON → 一键导入为结构化 Profile（教育/实习/项目/技能/偏好）
- 📡 **岗位**：录入 JD（公司/职位/地点/要求/URL）
- 🎯 **匹配**：选画像 × 岗位 → 规则匹配 → 分数条 + 优势/缺口 + 证据明细 + 硬条件阻塞标记
- 📨 **投递看板**：创建投递 + 状态机流转（下拉切换，非法转换报错）+ 事件计数
- 📄 **简历版本**：母版 → 岗位定制副本（fork，不覆盖母版）

## 运行

```bash
cd services/api
pip install -e ".[dev]"
uvicorn app.main:app --reload    # 浏览器打开 http://127.0.0.1:8000
```

后端通过 `app.mount("/", StaticFiles(...))` 直接服务本目录静态文件；API 前缀 `/api`。

## 规划

- 迁移 React/Next.js（计划书技术栈）；当前原生 JS 保证 MVP 可端到端演示
- 公开个人主页、分享链接（第 7 周）
