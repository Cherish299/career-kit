export function readOfferRunConfig(env, kind) {
  const limitKey = kind === "import" ? "OFFER_IMPORT_LIMIT" : "OFFER_PREVIEW_LIMIT";
  const limit = Number.parseInt(env[limitKey] || "5", 10);
  const pageLimit = Number.parseInt(env.OFFER_PAGE_LIMIT || "1", 10);
  const totalLimit = Number.parseInt(env.OFFER_TOTAL_LIMIT || String(limit), 10);

  if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
    throw new Error(`${limitKey} must be an integer from 1 to 20`);
  }
  if (!Number.isInteger(pageLimit) || pageLimit < 1 || pageLimit > 20) {
    throw new Error("OFFER_PAGE_LIMIT must be an integer from 1 to 20");
  }
  if (!Number.isInteger(totalLimit) || totalLimit < 1 || totalLimit > 400) {
    throw new Error("OFFER_TOTAL_LIMIT must be an integer from 1 to 400");
  }

  return { limit, pageLimit, totalLimit };
}
