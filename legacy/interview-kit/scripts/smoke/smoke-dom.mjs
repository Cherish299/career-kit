#!/usr/bin/env node
/* scripts/smoke/smoke-dom.mjs — interview-kit DOM 冒烟测试
 * 用法：node scripts/smoke/smoke-dom.mjs（需先 npm i jsdom：npm install --prefix scripts/smoke jsdom）
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const html = readFileSync(join(root, "dist", "interview-kit.html"), "utf8");

const errors = [];
const consoleErrors = [];
const dom = new JSDOM(html, {
  url: "https://localhost/interview-kit/",
  runScripts: "dangerously",
  pretendToBeVisual: true,
  beforeParse(window) {
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  }
});
dom.window.addEventListener("error", (e) => errors.push(e.message || String(e.error)));
const vc = dom.window._virtualConsole;
if (vc) {
  const orig = vc.emit.bind(vc);
  vc.emit = (method, ...args) => {
    const msg = String(args[0] && args[0].message || args[0]);
    if (method === "jsdomError" && /Not implemented: window\.(print|prompt)/.test(msg)) return;
    if (method === "jsdomError" || method === "error") consoleErrors.push(msg);
    return orig(method, ...args);
  };
}

const win = dom.window;
const doc = win.document;
const Q = win.INTERVIEW_QUESTIONS;
let failed = 0;
function assert(cond, name, extra) {
  if (cond) console.log("  ✓ " + name);
  else { failed++; console.log("  ✗ " + name + (extra ? "  → " + extra : "")); }
}
function $(s) { return doc.querySelector(s); }
function $$(s) { return Array.from(doc.querySelectorAll(s)); }
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 200));

console.log("[0] 题库数据");
assert(Array.isArray(Q) && Q.length >= 150, "题库 ≥ 150 题（实际 " + (Q && Q.length) + "）");

await tick(500);

/* ---------- 初始渲染 ---------- */
console.log("[1] 初始渲染");
assert($$(".tab").length === 4, "4 个选项卡");
assert($$(".cat-item").length === 10, "分类侧栏 10 项（全部 + 9 类）");
assert($$("#bankList .q-card").length > 50, "题库列表渲染出题（" + $$("#bankList .q-card").length + "）");
assert($("#bankCount").textContent.includes("共"), "题数统计显示");
assert(!!$("#writtenBody .setup-card"), "笔试设置页渲染");
assert(!!$("#interviewBody .setup-card"), "面试设置页渲染");
assert(!!$("#statsBody .stat-card"), "统计页渲染");
assert(!errors.length, "无未捕获 JS 错误" + (errors.length ? "：" + errors.join(" | ") : ""));

/* ---------- 题库交互 ---------- */
console.log("[2] 题库：搜索/筛选/展开/自评/收藏");
const searchInput = $("#searchInput");
searchInput.value = "LoRA";
searchInput.dispatchEvent(new win.Event("input", { bubbles: true }));
await tick(50);
const loraCards = $$("#bankList .q-card");
assert(loraCards.length >= 2, "搜索 LoRA 命中 ≥ 2 题（实际 " + loraCards.length + "）");
assert($("#bankList .q-text").textContent.includes("LoRA"), "命中的是 LoRA 相关题");
searchInput.value = "";
searchInput.dispatchEvent(new win.Event("input", { bubbles: true }));
await tick(50);
$$(".cat-item").forEach((c) => { if (c.dataset.cat === "llm") c.click(); });
await tick(50);
assert($$("#bankList .q-card").length >= 8, "筛选 llm 分类后 ≥ 8 题（实际 " + $$("#bankList .q-card").length + "）");
$$(".cat-item").forEach((c) => { if (c.dataset.cat === "") c.click(); });
await tick(50);

/* 展开解析 */
const firstCard = $("#bankList .q-card");
const firstQid = $(".q-id", firstCard).textContent.trim();
$('[data-q-sol]', firstCard).click();
await tick(50);
assert(!!$("#q-" + firstQid + " .q-solution"), "展开解析");
assert($("#q-" + firstQid + " .sol-head").textContent.includes("答案与解析"), "解析头部渲染");
$("#q-" + firstQid + " [data-q-sol]").click();
await tick(50);
assert(!$("#q-" + firstQid + " .q-solution"), "收起解析");

/* 自评 */
const firstQ = Q.filter((q) => q.id === firstQid)[0];
const rateBtn = $("#q-" + firstQid + ' [data-rate="' + firstQid + ':unknown"]');
rateBtn.click();
await tick(400);
let saved = win.localStorage.getItem("interviewKit:state:v1");
assert(!!saved && saved.includes('"unknown"'), "自评已持久化（unknown 进入错题本）");
/* 收藏 */
$("#q-" + firstQid + " [data-fav]").click();
await tick(400);
saved = win.localStorage.getItem("interviewKit:state:v1");
assert(!!saved && saved.includes('"fav":true'), "收藏已持久化");
assert(firstQ.type === "choice" || firstQ.type === "judge" || !$("#q-" + firstQid + " .q-options"), "题目渲染类型一致");

/* ---------- 笔试模拟 ---------- */
console.log("[3] 笔试模拟（自动判分）");
$$(".tab").forEach((t) => { if (t.dataset.tab === "written") t.click(); });
await tick(50);
$("#wCat").value = "llm";
$("#wCount").value = "10";
$("#wTime").value = "5";
$("#btnStartWritten").click();
await tick(100);
assert(!!$("#wTimer"), "计时器显示");
assert($$("input[name=w-answer]").length >= 2, "作答选项渲染");
let steps = 0;
while ($("#btnWNext") && steps < 12) {
  const radios = $$('input[name="w-answer"]');
  assert(radios.length >= 2, "第 " + (steps + 1) + " 题有选项");
  radios[0].checked = true;
  radios[0].dispatchEvent(new win.Event("change", { bubbles: true }));
  await tick(300);
  steps++;
}
await tick(300);
if ($("#btnWSubmit")) $("#btnWSubmit").click();
await tick(200);
const confirmBtn = $(".ok-go");
if (confirmBtn) confirmBtn.click();
await tick(300);
assert(!!$(".result-card"), "交卷后出现结果卡");
const resultNum = ($(".result-num").textContent || "").match(/\d+/);
assert(!!resultNum && parseInt(resultNum[0], 10) >= 0 && parseInt(resultNum[0], 10) <= 100, "判分结果有效（" + $(".result-num").textContent.trim() + "）");
assert($$(".review-item").length >= 5, "逐题解析渲染（实际 " + $$(".review-item").length + " 条）");
saved = win.localStorage.getItem("interviewKit:state:v1");
assert(!!saved && saved.includes('"quizTotal"'), "笔试记录已写入（quizTotal）");
assert(!!saved && saved.includes('"quizHistory"'), "历史记录已写入");
$("#btnWBack").click();
await tick(50);
assert(!!$("#btnStartWritten"), "返回笔试设置");

/* ---------- 面试模拟 ---------- */
console.log("[4] 面试模拟");
$$(".tab").forEach((t) => { if (t.dataset.tab === "interview") t.click(); });
await tick(50);
$("#iCat").value = "llm";
$("#iCount").value = "5";
$("#btnStartInterview").click();
await tick(100);
assert(!!$("#btnIReveal"), "面试题出现（先思考）");
assert(!$(".q-solution"), "未查看答案前不显示解析");
$("#btnIReveal").click();
await tick(50);
assert(!!$(".q-solution"), "查看答案后显示解析");
let iSteps = 0;
while (iSteps < 8) {
  const reveal = $("#btnIReveal");
  if (reveal) {
    reveal.click();
    await tick(60);
  }
  const rate = $("[data-irate]");
  if (!rate) break;
  rate.click();
  await tick(400);
  iSteps++;
}
await tick(300);
assert(!!$(".result-card"), "面试结束出现总结卡");
const ivResult = $(".result-num").textContent.trim();
assert(/\d+ \/ 5/.test(ivResult), "面试总结计数（" + ivResult + "）");
$("#btnIBack").click();
await tick(50);
assert(!!$("#btnStartInterview"), "返回面试设置");

/* ---------- 统计页 ---------- */
console.log("[5] 统计页");
$$(".tab").forEach((t) => { if (t.dataset.tab === "stats") t.click(); });
await tick(50);
assert($$("#statsBody .stat-card").length === 6, "6 张统计卡");
assert($$("#statsBody .progress-row").length >= 9, "分类进度行 ≥ 9");
assert($("#statsBody").textContent.includes("错题本"), "错题本区块存在");
assert($("#statsBody").textContent.includes("收藏"), "收藏区块存在");
assert($$("#statsBody [data-review]").length >= 1, "错题/收藏可跳转复习");
/* 复习跳转 */
$("#statsBody [data-review]").click();
await tick(100);
assert($("#tab-bank").classList.contains("active"), "跳转回题库页");

/* ---------- 错误检查 ---------- */
console.log("[6] 错误检查");
assert(!errors.length, "全程无未捕获 JS 错误" + (errors.length ? "：" + errors.join(" | ") : ""));
const realConsoleErrors = consoleErrors.filter((m) => !/Not implemented/.test(m));
assert(!realConsoleErrors.length, "无 jsdom 控制台错误" + (realConsoleErrors.length ? "：" + realConsoleErrors.join(" | ") : ""));

console.log(failed === 0 ? "\n冒烟测试全部通过 ✅" : "\n" + failed + " 项失败 ❌");
process.exit(failed === 0 ? 0 : 1);
