import { OfferQingBaoJuAdapter } from "../src/offerqingbaoju-adapter.js";
import { DEFAULT_KEYWORDS } from "../src/filter-jobs.js";
import { getSelectConfig, selectJobs } from "../src/select-jobs.js";

const limit = Number.parseInt(process.env.OFFER_PREVIEW_LIMIT || "5", 10);
if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
  throw new Error("OFFER_PREVIEW_LIMIT must be an integer from 1 to 20");
}

const config = getSelectConfig(process.env);
if (!config.anyKeywords.length) config.anyKeywords = DEFAULT_KEYWORDS;
const adapter = new OfferQingBaoJuAdapter({ limit });
const refs = await adapter.discover();
const rows = [];
for (const ref of refs) {
  const raw = await adapter.fetch(ref);
  rows.push(...await adapter.normalizeMany(raw));
}
const filtered = selectJobs(rows, config);

console.log(JSON.stringify({
  source: adapter.meta.key,
  limit,
  selectors: config,
  count: filtered.length,
  preview_only: true,
  persisted: false,
  rows: filtered,
}, null, 2));
