import { OfferQingBaoJuAdapter } from "../src/offerqingbaoju-adapter.js";
import { DEFAULT_KEYWORDS } from "../src/filter-jobs.js";
import { importJobs } from "../src/import-jobs.js";
import { getSelectConfig, selectJobs } from "../src/select-jobs.js";

const limit = Number.parseInt(process.env.OFFER_IMPORT_LIMIT || "5", 10);
const apiBase = process.env.CAREER_API_BASE || "http://127.0.0.1:8000";
const write = process.argv.includes("--write");

if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
  throw new Error("OFFER_IMPORT_LIMIT must be an integer from 1 to 20");
}
if (!write) {
  console.error("dry-run: no jobs will be written; add --write to import explicitly");
}

const config = getSelectConfig(process.env);
if (!config.anyKeywords.length) config.anyKeywords = DEFAULT_KEYWORDS;
const adapter = new OfferQingBaoJuAdapter({ limit });
const refs = await adapter.discover();
const rows = [];
for (const ref of refs) {
  rows.push(...await adapter.normalizeMany(await adapter.fetch(ref)));
}
const filtered = selectJobs(rows, config);

const result = await importJobs(filtered, { apiBase, write });
console.log(JSON.stringify({ source: adapter.meta.key, api_base: apiBase, limit, selectors: config, selected: filtered.length, ...result }, null, 2));
if (result.failed) process.exitCode = 1;
