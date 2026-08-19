export async function importJobs(rows, { fetchImpl = globalThis.fetch, apiBase = "http://127.0.0.1:8000", write = false, readExisting = null } = {}) {
  if (!write) return { written: false, imported: 0, skipped: rows.length, results: [], summary: summarizeResults([], rows.length) };
  if (typeof fetchImpl !== "function") throw new Error("fetch implementation unavailable");

  const existingMap = await loadExistingMap(rows, readExisting);
  const results = [];
  for (const row of rows) {
    const payload = { ...row, source: "crawler" };
    const response = await fetchImpl(`${apiBase}/api/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const detail = await response.text();
      results.push({ external_id: row.external_id, company_name: row.company_name, title: row.title, ok: false, status: response.status, detail });
      continue;
    }
    const job = await response.json();
    const existed = existingMap.has(row.external_id);
    results.push({ external_id: row.external_id, company_name: row.company_name, title: row.title, ok: true, job_id: job.id, action: existed ? "reused" : "created" });
  }

  return {
    written: true,
    imported: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok).length,
    results,
    summary: summarizeResults(results, 0),
  };
}

async function loadExistingMap(rows, readExisting) {
  if (typeof readExisting !== "function") return new Map();
  const externalIds = rows.map((row) => row.external_id).filter(Boolean);
  const existing = await readExisting(externalIds);
  return new Map((existing || []).map((item) => [item.external_id, item]));
}

function summarizeResults(results, skipped) {
  return {
    ok: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok).length,
    created: results.filter((item) => item.ok && item.action === "created").length,
    reused: results.filter((item) => item.ok && item.action === "reused").length,
    skipped,
    companies: [...new Set(results.filter((item) => item.ok && item.company_name).map((item) => item.company_name))].length,
  };
}
