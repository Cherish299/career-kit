import { mkdir, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";

export async function writeReport(outputPath, content) {
  const filePath = resolve(outputPath);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf-8");
  return filePath;
}

export function timestampedReportPath({ directory = "tmp", prefix = "offer-report", format = "json", now = new Date() } = {}) {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const extension = String(format).toLowerCase() === "markdown" ? "md" : String(format).toLowerCase();
  return `${directory}/${prefix}-${stamp}.${extension}`;
}

export function resolveReportOutput({ explicitPath, format = "json", env = process.env } = {}) {
  if (explicitPath) return explicitPath;
  if (env.OFFER_REPORT_AUTO_NAME !== "1") return "";
  return timestampedReportPath({
    directory: env.OFFER_REPORT_OUTPUT_DIR || "tmp",
    prefix: env.OFFER_REPORT_PREFIX || "offer-report",
    format,
  });
}
