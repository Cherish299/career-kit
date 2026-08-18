#!/usr/bin/env node
/* scripts/test-data.js — 题库数据完整性校验
 * 用法：node scripts/test-data.js
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const f of ["app/js/q-core.js", "app/js/q-llm.js", "app/js/q-extra.js"]) {
  new Function(readFileSync(join(root, f), "utf8"))();
}

const Q = globalThis.INTERVIEW_QUESTIONS;
const CAT_KEYS = ["ml", "dl", "llm", "train", "infer", "math", "code", "scene", "behavior"];
const TYPES = ["choice", "judge", "short", "code", "scene", "behavior"];

let failed = 0;
function assert(cond, name, extra) {
  if (cond) console.log("  ✓ " + name);
  else { failed++; console.log("  ✗ " + name + (extra ? "  → " + extra : "")); }
}

console.log("[1] 总量与分类");
assert(Array.isArray(Q) && Q.length >= 150, "总题数 ≥ 150（实际 " + Q.length + "）");
CAT_KEYS.forEach(function (key) {
  const n = Q.filter((q) => q.cat === key).length;
  assert(n >= 8, "分类 " + key + " ≥ 8 题（实际 " + n + "）");
});
assert(Q.filter((q) => q.type === "choice" || q.type === "judge").length >= 40, "自动判分题型（选择+判断）≥ 40 题（实际 " + Q.filter((q) => q.type === "choice" || q.type === "judge").length + "）");

console.log("[2] 字段完整性");
const ids = new Set();
const idDup = [];
const problems = [];
Q.forEach(function (q) {
  if (!q.id || ids.has(q.id)) idDup.push(q.id);
  ids.add(q.id);
  if (!CAT_KEYS.includes(q.cat)) problems.push(q.id + ": 未知分类 " + q.cat);
  if (!TYPES.includes(q.type)) problems.push(q.id + ": 未知题型 " + q.type);
  if (![1, 2, 3].includes(q.diff)) problems.push(q.id + ": 难度非法 " + q.diff);
  if (!q.q || !String(q.q).trim()) problems.push(q.id + ": 题目为空");
  if (!q.solution || !String(q.solution).trim()) problems.push(q.id + ": 解析为空");
  if (!Array.isArray(q.tags) || q.tags.length === 0) problems.push(q.id + ": 缺少标签");
  if (q.type === "choice") {
    if (!Array.isArray(q.options) || q.options.length < 2) problems.push(q.id + ": 选项不足");
    if (!q.answer || !/^[A-Z]$/.test(q.answer)) problems.push(q.id + ": 选择题答案非法 " + q.answer);
    else if (q.options && !q.options.some((o) => o.charAt(0) === q.answer)) problems.push(q.id + ": 答案 " + q.answer + " 不在选项中");
  }
  if (q.type === "judge" && q.answer !== "对" && q.answer !== "错") problems.push(q.id + ": 判断题答案非法 " + q.answer);
  if ((q.type === "short" || q.type === "code" || q.type === "scene" || q.type === "behavior") && q.answer !== undefined) problems.push(q.id + ": 主观题不应带标准答案字段");
});
assert(idDup.length === 0, "ID 唯一" + (idDup.length ? "：重复 " + idDup.join(",") : ""));
assert(problems.length === 0, "字段校验全部通过" + (problems.length ? "\n    " + problems.slice(0, 10).join("\n    ") : ""));

console.log("[3] 危险序列");
const dangerous = [];
Q.forEach(function (q) {
  if (String(q.q).includes("</script") || String(q.solution).includes("</script")) dangerous.push(q.id);
});
assert(dangerous.length === 0, "题目内容无 </script 序列");

console.log("[4] 题型分布");
const byType = {};
Q.forEach((q) => { byType[q.type] = (byType[q.type] || 0) + 1; });
console.log("    " + Object.keys(byType).map((k) => k + "=" + byType[k]).join("  "));

console.log(failed === 0 ? "\n题库校验全部通过 ✅" : "\n" + failed + " 项失败 ❌");
process.exit(failed === 0 ? 0 : 1);
