import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { SourceAdapter, normalizeJobRecord } from "./adapter.js";

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE_KEY = "offerqingbaoju-info-summary";
const SOURCE_URL = "https://offerqingbaoju.cn/info-summary";
const API_URL = "https://offerqingbaoju.cn/api";
const DEFAULT_NAVIGATION_ID = 60;

export class OfferQingBaoJuAdapter extends SourceAdapter {
  constructor({ fetchImpl = globalThis.fetch, navigationId = DEFAULT_NAVIGATION_ID, limit = 20, pageLimit = 1, totalLimit = 20, fixture = false } = {}) {
    super({ key: SOURCE_KEY, label: "Offer 情报局信息汇总" });
    this.fetchImpl = fetchImpl;
    this.navigationId = navigationId;
    this.limit = Math.max(1, Math.min(limit, 100));
    this.pageLimit = Math.max(1, Math.min(pageLimit, 20));
    this.totalLimit = Math.max(1, Math.min(totalLimit, 400));
    this.fixture = fixture;
    this.records = new Map();
    this.pageFallback = false;
  }

  async discover() {
    const records = this.fixture ? (await this.#loadFixture()).records.slice(0, this.totalLimit) : await this.#fetchPages();
    return records.map((record) => {
      const ref = this.#toRef(record);
      this.records.set(ref.external_id, record);
      return ref;
    });
  }

  async fetch(ref) {
    const cached = this.records.get(ref.external_id);
    if (cached) return cached;
    if (this.fixture) {
      const records = (await this.#loadFixture()).records;
      const record = records.find((item) => this.#toRef(item).external_id === ref.external_id);
      if (!record) throw new Error(`record not found: ${ref.external_id}`);
      return record;
    }
    const page = await this.#fetchPage(ref.page || 1, Math.min(this.limit, 100));
    const record = page.find((item) => this.#toRef(item).external_id === ref.external_id);
    if (!record) throw new Error(`record not found: ${ref.external_id}`);
    return record;
  }

  async parse(raw) {
    return (await this.parseMany(raw))[0];
  }

  async parseMany(raw) {
    const positions = this.#splitPositions(raw["职位"]);
    const baseId = this.#toRef(raw).external_id;
    const requirements = [
      raw["学历要求"],
      raw["毕业年份"] && `毕业年份：${raw["毕业年份"]}`,
      raw["招聘批次"] && `招聘批次：${raw["招聘批次"]}`,
    ].filter(Boolean).join("；");
    const description = [
      raw["招聘公告"] && `招聘公告：${raw["招聘公告"]}`,
      raw["企业性质"] && `企业性质：${raw["企业性质"]}`,
      raw["开始时间"] && `开始时间：${raw["开始时间"]}`,
      raw["截止时间"] && `截止时间：${raw["截止时间"]}`,
      raw["更新时时间"] || raw["更新时间"] ? `更新时间：${raw["更新时时间"] || raw["更新时间"]}` : "",
      positions.length > 1 ? `原始岗位列表：${positions.join("、")}` : "",
    ].filter(Boolean).join("\n");

    return positions.map((title, index) => ({
      source: SOURCE_KEY,
      external_id: `${baseId}:${index + 1}`,
      source_url: raw["投递地址"] || raw["公告链接"] || SOURCE_URL,
      title: title || raw["招聘公告"] || raw["企业名称"],
      company_name: raw["企业名称"],
      location: raw["工作地点"],
      description,
      requirements,
      status: "active",
    }));
  }

  async normalize(parsed) {
    return normalizeJobRecord(parsed);
  }

  async normalizeMany(raw) {
    const parsed = await this.parseMany(raw);
    return parsed.map((record) => normalizeJobRecord(record));
  }

  async healthCheck() {
    if (this.fixture) {
      const data = await this.#loadFixture();
      return { ok: Array.isArray(data.records), source: SOURCE_KEY, count: data.records.length, network_enabled: false };
    }
    if (typeof this.fetchImpl !== "function") {
      return { ok: false, source: SOURCE_KEY, error: "fetch implementation unavailable", network_enabled: true };
    }
    const records = await this.#fetchPage(1, 1);
    return { ok: true, source: SOURCE_KEY, count: records.length, network_enabled: true };
  }

  #toRef(record) {
    const row = record["_row_number"] ?? record.record_id;
    return {
      external_id: `${this.navigationId}:${row}`,
      url: record["投递地址"] || record["公告链接"] || SOURCE_URL,
      page: record.page || 1,
    };
  }

  #splitPositions(value) {
    const text = String(value || "");
    const parts = [];
    let current = "";
    let depth = 0;
    for (const char of text) {
      if ("（([{<".includes(char)) depth += 1;
      if ("）)]}>".includes(char)) depth = Math.max(0, depth - 1);
      if (depth === 0 && ",，、;；\\n".includes(char)) {
        if (current.trim()) parts.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    if (current.trim()) parts.push(current.trim());
    return parts.filter((item) => item !== "......" && item !== "…" && item !== "等");
  }

  async #fetchPage(page, perPage) {
    if (typeof this.fetchImpl !== "function") throw new Error("fetch implementation unavailable");
    const url = `${API_URL}/simple/navigation/${this.navigationId}/data?page=${page}&per_page=${perPage}`;
    const response = await this.fetchImpl(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Offer 情报局 API returned ${response.status}`);
    const body = await response.json();
    if (!Array.isArray(body.data)) throw new Error("Offer 情报局 API returned invalid data");
    return body.data.map((record) => ({ ...record, page }));
  }

  async #fetchPages() {
    const records = [];
    for (let page = 1; page <= this.pageLimit && records.length < this.totalLimit; page += 1) {
      try {
        const rows = await this.#fetchPage(page, this.limit);
        if (!rows.length) break;
        records.push(...rows);
        if (rows.length < this.limit) break;
      } catch (error) {
        if (page === 1 || this.pageLimit === 1) throw error;
        this.pageFallback = true;
        break;
      }
    }
    return records.slice(0, this.totalLimit);
  }

  async #loadFixture() {
    const text = await readFile(join(here, "fixtures", "offerqingbaoju-info-summary.json"), "utf-8");
    return JSON.parse(text);
  }
}
