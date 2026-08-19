import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { SourceAdapter, normalizeJobRecord } from "./adapter.js";

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE_KEY = "offerqingbaoju-info-summary";
const SOURCE_URL = "https://offerqingbaoju.cn/info-summary";

export class OfferQingBaoJuAdapter extends SourceAdapter {
  constructor() {
    super({ key: SOURCE_KEY, label: "Offer 情报局信息汇总" });
  }

  async discover() {
    const data = await this.#loadFixture();
    return data.records.map((record) => ({
      external_id: record.record_id,
      url: record.job_url || SOURCE_URL,
    }));
  }

  async fetch(ref) {
    const data = await this.#loadFixture();
    const record = data.records.find((item) => item.record_id === ref.external_id);
    if (!record) throw new Error(`record not found: ${ref.external_id}`);
    return record;
  }

  async parse(raw) {
    return {
      source: SOURCE_KEY,
      external_id: raw.record_id,
      source_url: raw.job_url || SOURCE_URL,
      title: raw.position_name,
      company_name: raw.company_name,
      location: raw.city,
      description: raw.summary,
      requirements: Array.isArray(raw.requirements) ? raw.requirements.join("、") : raw.requirements,
      status: "active",
    };
  }

  async normalize(parsed) {
    return normalizeJobRecord(parsed);
  }

  async healthCheck() {
    const data = await this.#loadFixture();
    return {
      ok: Array.isArray(data.records),
      source: SOURCE_KEY,
      count: data.records.length,
      network_enabled: false,
    };
  }

  async #loadFixture() {
    const text = await readFile(join(here, "fixtures", "offerqingbaoju-info-summary.json"), "utf-8");
    return JSON.parse(text);
  }
}
