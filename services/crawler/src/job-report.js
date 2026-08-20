export function buildJobReport({ source, limit, selectors, rows }) {
  return {
    source,
    limit,
    selectors,
    count: rows.length,
    generated_at: new Date().toISOString(),
    rows,
  };
}

export function formatJobReportMarkdown(report) {
  const lines = [
    `# Offer Job Report`,
    "",
    `- Source: ${report.source}`,
    `- Limit: ${report.limit}`,
    `- Count: ${report.count}`,
    `- Generated At: ${report.generated_at}`,
    "",
    "## Selectors",
    "",
    `- Navigation Names: ${joinList(report.selectors.navigationNames)}`,
    `- Navigation Ids: ${joinList(report.selectors.navigationIds)}`,
    `- Title Keywords: ${joinList(report.selectors.titleKeywords)}`,
    `- Any Keywords: ${joinList(report.selectors.anyKeywords)}`,
    `- Company Keywords: ${joinList(report.selectors.companyKeywords)}`,
    `- Location Keywords: ${joinList(report.selectors.locationKeywords)}`,
    `- Graduate Years: ${joinList(report.selectors.graduateYears)}`,
    `- Batch Keywords: ${joinList(report.selectors.batchKeywords)}`,
    "",
    "## Jobs",
    "",
  ];

  if (!report.rows.length) {
    lines.push("No jobs matched the current selectors.");
    return lines.join("\n");
  }

  for (const row of report.rows) {
    lines.push(`### ${row.title}`);
    lines.push(`- Company: ${row.company_name || ""}`);
    lines.push(`- Location: ${row.location || ""}`);
    lines.push(`- External ID: ${row.external_id || ""}`);
    lines.push(`- URL: ${row.source_url || ""}`);
    lines.push(`- Requirements: ${row.requirements || ""}`);
    lines.push("");
  }

  return lines.join("\n");
}

function joinList(items) {
  return items && items.length ? items.join(", ") : "(none)";
}
