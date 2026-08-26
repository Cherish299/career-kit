#!/usr/bin/env node
/* scripts/test.mjs — 统一测试：legacy + crawler + API 核心链路 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const steps = [
  { dir: join(root, "legacy", "resume-kit"), cmd: "node", args: ["scripts/test-engine.js"], name: "简历体检规则引擎单测" },
  { dir: join(root, "legacy", "interview-kit"), cmd: "node", args: ["scripts/test-data.js"], name: "AI 刷题题库校验" },
  { dir: root, cmd: "node", args: ["apps/web/public.smoke.mjs"], name: "公开主页静态冒烟" },
  { dir: join(root, "services", "crawler"), cmd: "node", args: ["tests/adapter.test.mjs"], name: "Crawler adapter 骨架测试" },
  { dir: join(root, "services", "api"), cmd: "python", args: ["-m", "pytest"], name: "API 集成与 Schema 测试" }
];

/* 冒烟测试需要 jsdom（npm ci --prefix scripts/smoke）；未安装则跳过并提示 */
const smokeDir = join(root, "legacy", "resume-kit", "scripts", "smoke");
if (existsSync(join(smokeDir, "node_modules", "jsdom"))) {
  steps.push({ dir: join(root, "legacy", "resume-kit"), cmd: "node", args: ["scripts/smoke/smoke-dom.mjs"], name: "简历工作台 DOM 冒烟" });
} else {
  process.stdout.write("\n(skip) DOM 冒烟需要 jsdom：npm ci --prefix legacy/resume-kit/scripts/smoke\n");
}

let failed = false;
for (const s of steps) {
  process.stdout.write(`\n==> ${s.name}\n`);
  const r = spawnSync(s.cmd, s.args, { cwd: s.dir, stdio: "inherit" });
  if (r.status !== 0) {
    process.stderr.write(`test failed: ${s.name} (exit ${r.status})\n`);
    failed = true;
  }
}
if (failed) process.exit(1);
process.stdout.write("\n✓ 全部测试通过\n");
