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
- `src/offerqingbaoju-adapter.js`：Offer 情报局公开 API adapter，支持限量分页读取；测试默认使用 fixture/mock，不联网
- `src/fixtures/sample-source.json`：样例来源数据
- `src/fixtures/offerqingbaoju-info-summary.json`：匿名字段映射样例，不代表真实页面结构
- `tests/adapter.test.mjs`：discover / fetch / parse / normalize / healthCheck 回归测试
- `scripts/preview-offerqingbaoju.mjs`：只读预览脚本，不写数据库
- `scripts/import-offerqingbaoju.mjs`：显式导入脚本，默认 dry-run，只有 `--write` 才调用 Job API

> 真实 API 预览默认最多读取 5 条，可用 `OFFER_PREVIEW_LIMIT=1..20` 调整。导入默认也是 dry-run；可通过 `OFFER_JOB_KEYWORDS` 做全文关键词筛选，并额外使用 `OFFER_TITLE_KEYWORDS`、`OFFER_COMPANY_KEYWORDS`、`OFFER_NAVIGATION_IDS`、`OFFER_NAVIGATION_NAMES`、`OFFER_LOCATION_KEYWORDS`、`OFFER_GRADUATE_YEARS`、`OFFER_BATCH_KEYWORDS` 做更精细的标题/公司/导航/地点/毕业年份/批次筛选。导入结果会输出 `summary` 汇总，并在写入时区分 `created` 和 `reused`。正式批量同步前仍需确认公开接口、robots.txt、使用条款和数据再利用边界。

只读预览：

- 默认输出 JSON
- 可设置 `OFFER_REPORT_FORMAT=md` 导出 Markdown 报告
- 可设置 `OFFER_REPORT_FORMAT=csv` 导出 CSV 报告
- 可附加 `--output=tmp/report.md`、`--output=tmp/report.json` 或 `--output=tmp/report.csv` 直接写入文件

```bash
cd services/crawler
$env:OFFER_PREVIEW_LIMIT="20"
$env:OFFER_NAVIGATION_NAMES="信息总表,实习"
$env:OFFER_TITLE_KEYWORDS="AI,算法,机器学习,后端"
$env:OFFER_JOB_KEYWORDS="大模型,RAG,Python,数据,Agent"
$env:OFFER_COMPANY_KEYWORDS="乐狗,华为,百度,腾讯,阿里"
$env:OFFER_LOCATION_KEYWORDS="杭州,深圳,全国"
$env:OFFER_GRADUATE_YEARS="2027,2028"
$env:OFFER_BATCH_KEYWORDS="秋招,实习"
$env:OFFER_REPORT_FORMAT="csv"
npm run preview:offer -- --output=tmp/offer-report.csv
```

导入前 dry-run：

```bash
$env:OFFER_IMPORT_LIMIT="20"
$env:OFFER_NAVIGATION_NAMES="信息总表,实习"
$env:OFFER_TITLE_KEYWORDS="AI,算法,机器学习,后端"
$env:OFFER_JOB_KEYWORDS="大模型,RAG,Python,数据,Agent"
$env:OFFER_COMPANY_KEYWORDS="乐狗,华为,百度,腾讯,阿里"
$env:OFFER_LOCATION_KEYWORDS="杭州,深圳,全国"
$env:OFFER_GRADUATE_YEARS="2027,2028"
$env:OFFER_BATCH_KEYWORDS="秋招,实习"
npm run import:offer
```

明确写入（要求 CareerOS API 已运行）：

```bash
npm run import:offer -- --write
```

运行：

```bash
cd services/crawler
npm test
```
