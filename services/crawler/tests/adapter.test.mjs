import test from "node:test";
import assert from "node:assert/strict";

import { normalizeJobRecord } from "../src/adapter.js";
import { SampleSourceAdapter } from "../src/sample-adapter.js";
import { OfferQingBaoJuAdapter } from "../src/offerqingbaoju-adapter.js";
import { applyRecordFilters } from "../src/filter-records.js";
import { filterJobs, getKeywordConfig } from "../src/filter-jobs.js";
import { importJobs } from "../src/import-jobs.js";
import { buildJobReport, formatJobReportCsv, formatJobReportMarkdown } from "../src/job-report.js";
import { fetchNavigations, resolveNavigationIdsByName } from "../src/navigation-index.js";
import { getSelectConfig, selectJobs } from "../src/select-jobs.js";
import { writeReport } from "../src/write-report.js";

test("normalizeJobRecord returns job payload for API", () => {
  const row = normalizeJobRecord({
    source: "sample-board",
    external_id: "job-001",
    source_url: "https://example.com/jobs/001",
    title: "AI 应用开发工程师",
    location: "深圳",
    company_name: "示例科技公司",
    description: "负责大模型应用开发",
    requirements: "熟悉 Python",
  });

  assert.equal(row.source, "sample-board");
  assert.equal(row.external_id, "job-001");
  assert.equal(row.company_name, "示例科技公司");
  assert.equal(row.status, "active");
});

test("sample adapter discovers and normalizes fixture jobs", async () => {
  const adapter = new SampleSourceAdapter();
  const refs = await adapter.discover();
  assert.equal(refs.length, 2);

  const raw = await adapter.fetch(refs[0]);
  const parsed = await adapter.parse(raw);
  const normalized = await adapter.normalize(parsed);

  assert.equal(normalized.source, "sample-board");
  assert.equal(normalized.external_id, refs[0].external_id);
  assert.equal(normalized.title, "AI 应用开发工程师");
  assert.equal(normalized.company_name, "示例科技公司");
});

test("sample adapter health check reports fixture availability", async () => {
  const adapter = new SampleSourceAdapter();
  const health = await adapter.healthCheck();

  assert.equal(health.ok, true);
  assert.equal(health.source, "sample-board");
  assert.equal(health.count, 2);
});

test("Offer 情报局 adapter maps anonymous fixture fields without network access", async () => {
  const adapter = new OfferQingBaoJuAdapter({ fixture: true });
  const refs = await adapter.discover();
  assert.deepEqual(refs, [
    { external_id: "60:1", url: "https://example.com/apply/demo-001", page: 1 },
  ]);

  const raw = await adapter.fetch(refs[0]);
  const normalizedRows = await adapter.normalizeMany(raw);
  const health = await adapter.healthCheck();

  assert.equal(normalizedRows.length, 2);
  assert.equal(normalizedRows[0].source, "offerqingbaoju-info-summary");
  assert.equal(normalizedRows[0].external_id, "60:1:1");
  assert.equal(normalizedRows[0].title, "AI 应用开发工程师");
  assert.equal(normalizedRows[1].external_id, "60:1:2");
  assert.equal(normalizedRows[1].title, "RAG 工程师");
  assert.equal(normalizedRows[0].company_name, "匿名科技公司");
  assert.match(normalizedRows[0].requirements, /本科及以上/);
  assert.equal(health.network_enabled, false);
});

test("Offer 情报局 adapter keeps commas inside parentheses", async () => {
  const adapter = new OfferQingBaoJuAdapter({ fixture: true });
  const raw = {
    _row_number: 9,
    企业名称: "括号样例公司",
    职位: "实习教师（英语、信息技术与人工智能）,算法工程师",
    工作地点: "上海",
  };
  const rows = await adapter.normalizeMany(raw);
  assert.deepEqual(rows.map((row) => row.title), ["实习教师（英语、信息技术与人工智能）", "算法工程师"]);
});

test("Offer 情报局 adapter maps mocked public API fields", async () => {
  const calls = [];
  const adapter = new OfferQingBaoJuAdapter({
    limit: 2,
    fetchImpl: async (url) => {
      calls.push(url);
      return {
        ok: true,
        async json() {
          return {
            data: [{
              _row_number: 7,
              企业名称: "公开样例公司",
              公告链接: "https://example.com/notice/7",
              投递地址: "https://example.com/apply/7",
              工作地点: "深圳",
              职位: "机器学习工程师",
              学历要求: "硕士",
              毕业年份: "2027",
              招聘批次: "秋招",
              招聘公告: "公开样例公司招聘公告",
              开始时间: "2026-08-18",
              截止时间: "招满为止",
              更新时间: "2026-08-19"
            }]
          };
        }
      };
    }
  });

  const refs = await adapter.discover();
  const normalizedRows = await adapter.normalizeMany(await adapter.fetch(refs[0]));
  assert.equal(refs[0].external_id, "60:7");
  assert.equal(normalizedRows.length, 1);
  assert.equal(normalizedRows[0].title, "机器学习工程师");
  assert.equal(normalizedRows[0].external_id, "60:7:1");
  assert.equal(normalizedRows[0].company_name, "公开样例公司");
  assert.equal(calls.length, 1);
  assert.match(calls[0], /per_page=2/);
});

test("filterJobs keeps only rows matching target keywords", () => {
  const rows = [
    { title: "AI 应用开发工程师", description: "负责大模型应用", requirements: "Python", company_name: "甲", location: "深圳" },
    { title: "财务管培生", description: "财务轮岗", requirements: "会计", company_name: "乙", location: "杭州" },
  ];
  const keywords = getKeywordConfig("AI,RAG,Python");
  const filtered = filterJobs(rows, keywords);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].title, "AI 应用开发工程师");
});

test("selectJobs supports title company and navigation filters together", () => {
  const rows = [
    { external_id: "60:1:1", title: "AI工程师", description: "大模型应用", requirements: "Python", company_name: "乐狗科技", location: "全国" },
    { external_id: "61:1:1", title: "算法工程师", description: "机器学习", requirements: "Python", company_name: "其他公司", location: "深圳" },
    { external_id: "60:2:1", title: "后端开发", description: "Java", requirements: "Spring", company_name: "乐狗科技", location: "杭州" },
  ];
  const config = getSelectConfig({
    OFFER_TITLE_KEYWORDS: "AI,算法",
    OFFER_JOB_KEYWORDS: "大模型,机器学习",
    OFFER_COMPANY_KEYWORDS: "乐狗",
    OFFER_NAVIGATION_IDS: "60",
  });
  const selected = selectJobs(rows, config);
  assert.equal(selected.length, 1);
  assert.equal(selected[0].title, "AI工程师");
});

test("resolveNavigationIdsByName matches navigation names to ids", async () => {
  const rows = [
    { id: "60", name: "信息总表", file_count: 1, updated_at: "" },
    { id: "65", name: "校招实习内推合集", file_count: 1, updated_at: "" },
  ];
  assert.deepEqual(resolveNavigationIdsByName(rows, ["信息总表", "实习"]), ["60", "65"]);
});

test("applyRecordFilters supports location graduate year and batch", () => {
  const records = [
    { 工作地点: "杭州,深圳", 毕业年份: "2027", 招聘批次: "秋招" },
    { 工作地点: "北京", 毕业年份: "2026", 招聘批次: "实习" },
  ];
  const config = getSelectConfig({
    OFFER_LOCATION_KEYWORDS: "杭州,深圳",
    OFFER_GRADUATE_YEARS: "2027",
    OFFER_BATCH_KEYWORDS: "秋招",
  });
  const filtered = applyRecordFilters(records, config);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]["毕业年份"], "2027");
});

test("job report formats JSON payload and markdown output", () => {
  const report = buildJobReport({
    source: "offerqingbaoju-info-summary",
    limit: 5,
    selectors: {
      navigationNames: ["信息总表"],
      navigationIds: ["60"],
      titleKeywords: ["ai"],
      anyKeywords: ["python"],
      companyKeywords: ["乐狗"],
      locationKeywords: ["全国"],
      graduateYears: ["2027"],
      batchKeywords: ["秋招"],
    },
    rows: [{
      title: "AI工程师（游戏理解方向）",
      company_name: "乐狗科技",
      location: "全国",
      external_id: "60:19:8",
      source_url: "https://example.com/job",
      requirements: "毕业年份：2027；招聘批次：秋招",
    }],
  });
  assert.equal(report.count, 1);
  const markdown = formatJobReportMarkdown(report);
  assert.match(markdown, /# Offer Job Report/);
  assert.match(markdown, /AI工程师（游戏理解方向）/);
  assert.match(markdown, /乐狗科技/);
  const csv = formatJobReportCsv(report);
  assert.match(csv, /title,company_name,location,external_id,source_url,requirements/);
  assert.match(csv, /乐狗科技/);
});

test("writeReport saves rendered report to file", async () => {
  const saved = await writeReport("tmp/offer-report-test.md", "# demo");
  assert.match(saved, /offer-report-test\.md$/);
});

test("importJobs defaults to dry-run and writes only with explicit opt-in", async () => {
  const row = { source: "offerqingbaoju-info-summary", external_id: "60:1:1", title: "样例岗位" };
  const dryRun = await importJobs([row], { fetchImpl: async () => { throw new Error("must not call API"); } });
  assert.equal(dryRun.written, false);
  assert.equal(dryRun.skipped, 1);
  assert.equal(dryRun.summary.ok, 0);
  assert.equal(dryRun.summary.skipped, 1);

  const calls = [];
  const written = await importJobs([row], {
    write: true,
    apiBase: "http://test-server",
    readExisting: async () => [{ external_id: "60:1:1" }],
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, async json() { return { id: "job-1" }; } };
    },
  });
  assert.equal(written.imported, 1);
  assert.equal(written.summary.ok, 1);
  assert.equal(written.summary.reused, 1);
  assert.equal(written.results[0].action, "reused");
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].url, "http://test-server/api/jobs");
});
