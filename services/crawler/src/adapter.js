export class SourceAdapter {
  constructor(meta) {
    this.meta = meta;
  }

  async discover() {
    throw new Error("discover() not implemented");
  }

  async fetch(_ref) {
    throw new Error("fetch() not implemented");
  }

  async parse(_raw) {
    throw new Error("parse() not implemented");
  }

  async normalize(_parsed) {
    throw new Error("normalize() not implemented");
  }

  async healthCheck() {
    return { ok: true, source: this.meta.key };
  }
}

export function assertString(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value.trim();
}

export function normalizeJobRecord(record) {
  return {
    source: assertString(record.source, "source"),
    external_id: assertString(record.external_id, "external_id"),
    source_url: String(record.source_url || "").trim(),
    title: assertString(record.title, "title"),
    location: String(record.location || "").trim(),
    company_name: String(record.company_name || "").trim(),
    description: String(record.description || "").trim(),
    requirements: String(record.requirements || "").trim(),
    status: String(record.status || "active").trim() || "active",
  };
}
