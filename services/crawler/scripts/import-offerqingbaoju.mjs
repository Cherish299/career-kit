import { OfferQingBaoJuAdapter } from "../src/offerqingbaoju-adapter.js";
import { applyRecordFilters } from "../src/filter-records.js";
import { DEFAULT_KEYWORDS } from "../src/filter-jobs.js";
import { importJobs } from "../src/import-jobs.js";
import { fetchNavigations, resolveNavigationIdsByName } from "../src/navigation-index.js";
import { readOfferRunConfig } from "../src/offer-run-config.js";
import { readExistingJobs } from "../src/read-existing-jobs.js";
import { getSelectConfig, selectJobs } from "../src/select-jobs.js";

const { limit, pageLimit, totalLimit } = readOfferRunConfig(process.env, "import");
const apiBase = process.env.CAREER_API_BASE || "http://127.0.0.1:8000";
const write = process.argv.includes("--write");
if (!write) {
  console.error("dry-run: no jobs will be written; add --write to import explicitly");
}

const config = getSelectConfig(process.env);
if (!config.anyKeywords.length) config.anyKeywords = DEFAULT_KEYWORDS;
if (config.navigationNames.length) {
  const navigations = await fetchNavigations();
  config.navigationIds = [...new Set([...config.navigationIds, ...resolveNavigationIdsByName(navigations, config.navigationNames)])];
}
const adapter = new OfferQingBaoJuAdapter({ limit, pageLimit, totalLimit });
const refs = await adapter.discover();
const rows = [];
for (const ref of refs) {
  const raw = await adapter.fetch(ref);
  if (!applyRecordFilters([raw], config).length) continue;
  rows.push(...await adapter.normalizeMany(raw));
}
const filtered = selectJobs(rows, config);

const result = await importJobs(filtered, {
  apiBase,
  write,
  readExisting: (externalIds) => readExistingJobs(externalIds, { apiBase }),
});
console.log(JSON.stringify({ source: adapter.meta.key, api_base: apiBase, limit: totalLimit, selectors: { ...config, pageLimit, totalLimit, pageFallback: adapter.pageFallback }, selected: filtered.length, ...result }, null, 2));
if (result.failed) process.exitCode = 1;
