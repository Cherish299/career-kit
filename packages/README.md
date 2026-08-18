# packages — 共享包

CareerOS 的共享代码层（计划第 2-3 周起迁移）。

| 包 | 内容 | 来源 |
| --- | --- | --- |
| `profile-schema` | 个人画像 Schema 与导入迁移规则 | 新建（Day 3） |
| `resume-engine` | 简历模板、体检、导出、版本生成 | 从 `legacy/resume-kit/app/js` 迁移 |
| `job-matcher` | 硬过滤、关键词/BM25、语义匹配与解释 | 新建（第 3 周） |
| `interview-kit` | 题库、判分、JD 定向准备 | 从 `legacy/interview-kit` 迁移 |

> 迁移原则：legacy 保持可运行；规则逻辑以 Node 直跑 + 契约测试，逐步包一层 API。
