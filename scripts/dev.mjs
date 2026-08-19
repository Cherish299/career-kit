#!/usr/bin/env node
/* scripts/dev.mjs — 统一启动 FastAPI 后端和 apps/web 静态工作台。 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = join(root, "services", "api");
const python = process.platform === "win32" ? "python" : "python3";
const args = ["-m", "uvicorn", "app.main:app", "--reload"];
const env = {
  ...process.env,
  CAREER_DATABASE_URL: process.env.CAREER_DATABASE_URL || "sqlite:///./dev.db",
};
const child = spawn(python, args, { cwd: apiDir, stdio: "inherit", env });

const stop = () => {
  if (!child.killed) child.kill("SIGINT");
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
child.on("exit", (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});
child.on("error", (err) => {
  console.error(`无法启动 Python/Uvicorn：${err.message}`);
  process.exit(1);
});
