#!/usr/bin/env node
/* scripts/export-questions.mjs — 把 legacy interview-kit 题库导出为后端可读的结构化 JSON
 *
 * 用法：
 *   node scripts/export-questions.mjs            生成 services/api/app/services/interview_questions.json
 *   node scripts/export-questions.mjs --check    只校验题库，不写文件（供统一测试使用）
 *
 * 只导出精简字段 {id, cat, type, diff, q, tags}；完整解析留在 legacy 工具内。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILES = ["q-core.js", "q-llm.js", "q-extra.js", "q-rag.js", "q-agent.js", "q-custom.js"];
const CATS = ["ml", "dl", "llm", "train", "infer", "math", "code", "scene", "behavior", "rag", "agent", "kg"];

const Q = globalThis.INTERVIEW_QUESTIONS || [];
for (const f of FILES) {
  new Function(readFileSync(join(root, "app", "js", f), "utf8"))();
}
const questions = globalThis.INTERVIEW_QUESTIONS || Q;

let failed = 0;
function assert(cond, name, extra) {
  if (cond) console.log("  ✓ " + name);
  else { failed++; console.log("  ✗ " + name + (extra ? "  → " + extra : "")); }
}

console.log("[export] 题库结构化校验");
assert(Array.isArray(questions) && questions.length >= 150, "总题数 ≥ 150（实际 " + questions.length + "）");
for (const cat of CATS) {
  const n = questions.filter((q) => q.cat === cat).length;
  assert(n >= 1, "分类 " + cat + " 有题（实际 " + n + "）");
}
const idSet = new Set(questions.map((q) => q.id));
assert(idSet.size === questions.length, "ID 唯一");
assert(
  questions.every((q) => q.q && q.cat && [1, 2, 3].includes(q.diff)),
  "题目字段完整"
);

if (failed > 0) {
  console.error("\n题库导出校验失败");
  process.exit(1);
}

if (process.argv.includes("--check")) {
  console.log("\n题库导出校验通过 ✅（未写文件）");
  process.exit(0);
}

const target = join(root, "..", "..", "services", "api", "app", "services", "interview_questions.json");
const slim = questions.map((q) => ({
  id: q.id,
  cat: q.cat,
  type: q.type,
  diff: q.diff,
  q: q.q,
  tags: q.tags || [],
}));
writeFileSync(target, JSON.stringify(slim, null, 2) + "\n");
console.log("\n已导出 " + slim.length + " 题 → " + target);
