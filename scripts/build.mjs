#!/usr/bin/env node
/* scripts/build.mjs — 统一构建：legacy 两个工具的单文件 HTML + DSH 插件 bundle */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const targets = [
  { dir: join(root, "legacy", "resume-kit"), name: "resume-kit" },
  { dir: join(root, "legacy", "interview-kit"), name: "interview-kit" }
];

let failed = false;
for (const t of targets) {
  process.stdout.write(`\n==> build ${t.name}\n`);
  const r = spawnSync("node", ["scripts/build.js"], { cwd: t.dir, stdio: "inherit" });
  if (r.status !== 0) {
    process.stderr.write(`build failed: ${t.name} (exit ${r.status})\n`);
    failed = true;
  }
}
if (failed) process.exit(1);
process.stdout.write("\n✓ 全部构建完成（resume-workbench.html / interview-kit.html）\n");
