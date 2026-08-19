import test from "node:test";
import assert from "node:assert/strict";

import { normalizeJobRecord } from "../src/adapter.js";
import { SampleSourceAdapter } from "../src/sample-adapter.js";
import { OfferQingBaoJuAdapter } from "../src/offerqingbaoju-adapter.js";

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
  const adapter = new OfferQingBaoJuAdapter();
  const refs = await adapter.discover();
  assert.deepEqual(refs, [
    { external_id: "demo-company-001", url: "https://offerqingbaoju.cn/info-summary" },
  ]);

  const raw = await adapter.fetch(refs[0]);
  const parsed = await adapter.parse(raw);
  const normalized = await adapter.normalize(parsed);
  const health = await adapter.healthCheck();

  assert.equal(normalized.source, "offerqingbaoju-info-summary");
  assert.equal(normalized.external_id, "demo-company-001");
  assert.equal(normalized.title, "AI 应用开发工程师");
  assert.equal(normalized.company_name, "匿名科技公司");
  assert.equal(normalized.requirements, "Python、FastAPI、RAG");
  assert.equal(health.network_enabled, false);
});
