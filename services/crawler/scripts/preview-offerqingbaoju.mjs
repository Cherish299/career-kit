import { OfferQingBaoJuAdapter } from "../src/offerqingbaoju-adapter.js";
import { applyRecordFilters } from "../src/filter-records.js";
import { DEFAULT_KEYWORDS } from "../src/filter-jobs.js";
import { buildJobReport, formatJobReportCsv, formatJobReportMarkdown } from "../src/job-report.js";
import { fetchNavigations, resolveNavigationIdsByName } from "../src/navigation-index.js";
import { readOfferRunConfig } from "../src/offer-run-config.js";
import { getSelectConfig, selectJobs } from "../src/select-jobs.js";
import { resolveReportOutput, writeReport } from "../src/write-report.js";

const { limit, pageLimit, totalLimit } = readOfferRunConfig(process.env, "preview");

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
const report = buildJobReport({
  source: adapter.meta.key,
  limit: totalLimit,
  selectors: { ...config, pageLimit, totalLimit, pageFallback: adapter.pageFallback },
  rows: filtered,
});
const reportFormat = String(process.env.OFFER_REPORT_FORMAT || "json").toLowerCase();
const explicitOutputPath = process.argv.find((arg) => arg.startsWith("--output="))?.slice("--output=".length);
const outputPath = resolveReportOutput({ explicitPath: explicitOutputPath, format: reportFormat });
const rendered = reportFormat === "md" || reportFormat === "markdown"
  ? formatJobReportMarkdown(report)
  : reportFormat === "csv"
    ? formatJobReportCsv(report)
    : JSON.stringify({ ...report, preview_only: true, persisted: false }, null, 2);

if (outputPath) {
  const savedTo = await writeReport(outputPath, rendered);
  console.log(`saved report to ${savedTo}`);
} else {
  console.log(rendered);
}
