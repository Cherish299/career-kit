# services/crawler — 招聘官网采集服务

CareerOS 的岗位采集服务（计划第 5 周起搭建，P1）。

## 规划

- 每个招聘来源实现独立 Adapter：discover / fetch / parse / normalize / health_check
- 优先公开 API、JSON、RSS、JSON-LD、Sitemap；必要时 Playwright
- 增量采集：内容哈希、去重、变更快照（JobSnapshot）

## 状态

⏳ 待开发（M1 之后）
