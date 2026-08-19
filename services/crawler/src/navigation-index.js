const API_URL = "https://offerqingbaoju.cn/api";

export async function fetchNavigations({ fetchImpl = globalThis.fetch, page = 1, perPage = 50 } = {}) {
  if (typeof fetchImpl !== "function") throw new Error("fetch implementation unavailable");
  const url = `${API_URL}/simple/navigations?page=${page}&per_page=${perPage}`;
  const response = await fetchImpl(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Offer 情报局 navigation API returned ${response.status}`);
  const body = await response.json();
  const rows = Array.isArray(body.navigations) ? body.navigations : [];
  return rows.map((item) => ({
    id: String(item.id),
    name: String(item.name || ""),
    file_count: Number(item.file_count || 0),
    updated_at: String(item.updated_at || ""),
  }));
}

export function resolveNavigationIdsByName(navigations, names) {
  if (!names.length) return [];
  return navigations
    .filter((nav) => names.some((name) => nav.name.toLowerCase().includes(name)))
    .map((nav) => nav.id);
}
