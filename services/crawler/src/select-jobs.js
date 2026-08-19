export function getSelectConfig(env = process.env) {
  return {
    titleKeywords: splitList(env.OFFER_TITLE_KEYWORDS),
    anyKeywords: splitList(env.OFFER_JOB_KEYWORDS),
    companyKeywords: splitList(env.OFFER_COMPANY_KEYWORDS),
    navigationIds: splitList(env.OFFER_NAVIGATION_IDS),
  };
}

export function selectJobs(rows, config) {
  return rows.filter((row) => {
    const titleText = String(row.title || "").toLowerCase();
    const anyText = [row.title, row.description, row.requirements, row.company_name, row.location]
      .filter(Boolean)
      .join("\n")
      .toLowerCase();
    const companyText = String(row.company_name || "").toLowerCase();
    const navigationId = String(row.external_id || "").split(":")[0] || "";

    if (config.navigationIds.length && !config.navigationIds.includes(navigationId)) return false;
    if (config.companyKeywords.length && !config.companyKeywords.some((keyword) => companyText.includes(keyword))) return false;
    if (config.titleKeywords.length && !config.titleKeywords.some((keyword) => titleText.includes(keyword))) return false;
    if (config.anyKeywords.length && !config.anyKeywords.some((keyword) => anyText.includes(keyword))) return false;
    return true;
  });
}

function splitList(value) {
  if (!value || !String(value).trim()) return [];
  return String(value)
    .split(/[,，;；\n]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}
