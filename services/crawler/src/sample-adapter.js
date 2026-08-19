import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { SourceAdapter, normalizeJobRecord } from "./adapter.js";

const here = dirname(fileURLToPath(import.meta.url));

export class SampleSourceAdapter extends SourceAdapter {
  constructor() {
    super({ key: "sample-board", label: "Sample Board" });
  }

  async discover() {
    const data = await this.#loadFixture();
    return data.jobs.map((job) => ({ external_id: job.id, url: job.url }));
  }

  async fetch(ref) {
    const data = await this.#loadFixture();
    const row = data.jobs.find((job) => job.id === ref.external_id);
    if (!row) throw new Error(`job not found: ${ref.external_id}`);
    return row;
  }

  async parse(raw) {
    return {
      source: this.meta.key,
      external_id: raw.id,
      source_url: raw.url,
      title: raw.title,
      company_name: raw.company,
      location: raw.location,
      description: raw.description,
      requirements: raw.requirements,
      status: "active",
    };
  }

  async normalize(parsed) {
    return normalizeJobRecord(parsed);
  }

  async healthCheck() {
    const data = await this.#loadFixture();
    return { ok: Array.isArray(data.jobs), source: this.meta.key, count: data.jobs.length };
  }

  async #loadFixture() {
    const text = await readFile(join(here, "fixtures", "sample-source.json"), "utf-8");
    return JSON.parse(text);
  }
}
