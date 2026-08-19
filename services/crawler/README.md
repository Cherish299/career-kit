# services/crawler — 招聘官网采集服务

CareerOS 的岗位采集服务（计划第 5 周起搭建，P1）。

## 规划

- 每个招聘来源实现独立 Adapter：discover / fetch / parse / normalize / health_check
- 优先公开 API、JSON、RSS、JSON-LD、Sitemap；必要时 Playwright
- 增量采集：内容哈希、去重、变更快照（JobSnapshot）

## 状态

🔄 已建立首个 adapter 骨架与 fixture：

- `src/adapter.js`：统一 Adapter 基类与 Job 归一化工具
- `src/sample-adapter.js`：基于本地 fixture 的示例来源实现
- `src/offerqingbaoju-adapter.js`：Offer 情报局信息汇总的字段映射草稿，仅读取匿名 fixture
- `src/fixtures/sample-source.json`：样例来源数据
- `src/fixtures/offerqingbaoju-info-summary.json`：匿名字段映射样例，不代表真实页面结构
- `tests/adapter.test.mjs`：discover / fetch / parse / normalize / healthCheck 回归测试

> 当前 Offer 情报局 adapter 不联网、不请求真实页面，也不代表已经获得站点授权；后续正式接入前仍需确认公开接口、robots.txt、使用条款和数据再利用边界。

运行：

```bash
cd services/crawler
npm test
```
