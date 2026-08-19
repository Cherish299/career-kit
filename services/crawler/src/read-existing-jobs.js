export async function readExistingJobs(externalIds, { fetchImpl = globalThis.fetch, apiBase = "http://127.0.0.1:8000" } = {}) {
  if (typeof fetchImpl !== "function") throw new Error("fetch implementation unavailable");
  if (!externalIds.length) return [];
  const response = await fetchImpl(`${apiBase}/api/jobs`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`CareerOS API returned ${response.status} while reading jobs`);
  const jobs = await response.json();
  const wanted = new Set(externalIds);
  return jobs.filter((job) => job.source === "crawler" && wanted.has(job.external_id));
}
