export function applyRecordFilters(records, config) {
  return records.filter((record) => {
    const locationText = String(record["工作地点"] || "").toLowerCase();
    const graduateText = String(record["毕业年份"] || "").toLowerCase();
    const batchText = String(record["招聘批次"] || "").toLowerCase();

    if (config.locationKeywords.length && !config.locationKeywords.some((keyword) => locationText.includes(keyword))) return false;
    if (config.graduateYears.length && !config.graduateYears.some((keyword) => graduateText.includes(keyword))) return false;
    if (config.batchKeywords.length && !config.batchKeywords.some((keyword) => batchText.includes(keyword))) return false;
    return true;
  });
}
