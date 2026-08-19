export async function importJobs(rows, { fetchImpl = globalThis.fetch, apiBase = "http://127.0.0.1:8000", write = false } = {}) {
  if (!write) return { written: false, imported: 0, skipped: rows.length, results: [] };
  if (typeof fetchImpl !== "function") throw new Error("fetch implementation unavailable");

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
      results.push({ external_id: row.external_id, ok: false, status: response.status, detail });
      continue;
    }
    const job = await response.json();
    results.push({ external_id: row.external_id, ok: true, job_id: job.id });
  }

  return {
    written: true,
    imported: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok).length,
    results,
  };
}
