#!/usr/bin/env node
/* scripts/build.js — interview-kit 构建脚本（纯 Node，无依赖）
 * 产出：dist/interview-kit.html（单文件应用）+ dsh-plugin/dist/client.js（插件 bundle）
 * 用法：node scripts/build.js
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const appDir = join(root, "app");
const distDir = join(root, "dist");
const pluginDir = join(root, "dsh-plugin");

const JS_ORDER = ["js/q-core.js", "js/q-llm.js", "js/q-extra.js", "js/q-rag.js", "js/q-agent.js", "js/q-custom.js", "js/app.js"];

function jsString(s) {
  return JSON.stringify(s).replace(/</g, "\\u003c");
}

/* ---------- 组合单文件 HTML ---------- */
let html = readFileSync(join(appDir, "index.html"), "utf8");
const css = readFileSync(join(appDir, "style.css"), "utf8");
html = html.replace('<link rel="stylesheet" href="style.css">', function () {
  return "<style>\n" + css + "\n</style>";
});
for (const js of JS_ORDER) {
  const content = readFileSync(join(appDir, js), "utf8");
  html = html.replace('<script src="' + js + '"></script>', function () {
    return "<script>\n" + content + "\n<\/script>";
  });
}
mkdirSync(distDir, { recursive: true });
writeFileSync(join(distDir, "interview-kit.html"), html);

/* ---------- DSH 插件包 ---------- */
mkdirSync(join(pluginDir, "dist"), { recursive: true });

const nodeHalf = [
  "//#region lib/types/index.js",
  "/** Host loader entry for the browser-side interview-kit plugin. */",
  "/** Provides no host-side behavior (pure UI plugin). */",
  "function apply() {}",
  "//#endregion",
  "export { apply };",
  ""
].join("\n");
writeFileSync(join(pluginDir, "dist", "index.js"), nodeHalf);

const clientBundle = [
  'window.__ModuleLoader__.load({',
  '\tid: "dsh-interview-kit",',
  '\tfactory: (require) => {',
  '\t\tvar module = { exports: {} };',
  '\t\tvar exports = module.exports;',
  '\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: "Module" });',
  '\t\tlet react = require("react");',
  '\t\tlet react_jsx_runtime = require("react/jsx-runtime");',
  '',
  '\t\t/** 内嵌的 AI 岗刷题单文件应用（由 scripts/build.js 生成） */',
  '\t\tconst APP_HTML = ' + jsString(html) + ';',
  '',
  '\t\tlet open = false;',
  '\t\tconst listeners = new Set();',
  '\t\tfunction subscribe(fn) { listeners.add(fn); return () => { listeners.delete(fn); }; }',
  '\t\tfunction getOpen() { return open; }',
  '\t\tfunction setOpen(v) { open = !!v; listeners.forEach((fn) => fn()); }',
  '',
  '\t\t/* ---- 图标：闪电 + 问号 ---- */',
  '\t\tfunction QuizIcon(props) {',
  '\t\t\treturn react_jsx_runtime.jsx("svg", {',
  '\t\t\t\twidth: props.size || 16, height: props.size || 16, viewBox: "0 0 16 16",',
  '\t\t\t\tfill: "none", stroke: "currentColor", strokeWidth: 1.4,',
  '\t\t\t\tstrokeLinecap: "round", strokeLinejoin: "round",',
  '\t\t\t\tchildren: [',
  '\t\t\t\t\treact_jsx_runtime.jsx("path", { d: "M9 1.5 3.5 9h3.5L7 14.5 12.5 7H9z" }),',
  '\t\t\t]',
  '\t\t});',
  '\t\t}',
  '',
  '\t\t/* ---- 侧边栏底部入口按钮 ---- */',
  '\t\tfunction FooterAction(props) {',
  '\t\t\tconst isOpen = react.useSyncExternalStore(subscribe, getOpen);',
  '\t\t\treturn react_jsx_runtime.jsx("button", {',
  '\t\t\t\ttype: "button",',
  '\t\t\t\ttitle: "AI 岗刷题 · 笔试面试",',
  '\t\t\t\t"aria-label": "AI 岗刷题",',
  '\t\t\t\t"data-interview-kit": "footer",',
  '\t\t\t\tonClick: () => setOpen(!isOpen),',
  '\t\t\t\tstyle: {',
  '\t\t\t\t\tappearance: "none", background: "transparent", border: "none",',
  '\t\t\t\t\tcursor: "pointer", color: "var(--dsw-alias-label-secondary)",',
  '\t\t\t\t\twidth: props.wide ? "auto" : 36, height: 36, borderRadius: 10,',
  '\t\t\t\t\tdisplay: "inline-flex", alignItems: "center", justifyContent: props.wide ? "flex-start" : "center",',
  '\t\t\t\t\tgap: 8, padding: props.wide ? "0 10px" : 0, fontSize: 13, fontFamily: "inherit", flex: "0 0 auto", marginRight: props.wide ? 6 : 0',
  '\t\t\t\t},',
  '\t\t\t\tonMouseEnter: (e) => { e.currentTarget.style.background = "var(--dsw-alias-interactive-bg-hover)"; },',
  '\t\t\t\tonMouseLeave: (e) => { e.currentTarget.style.background = "transparent"; },',
  '\t\t\t\tchildren: [',
  '\t\t\t\t\treact_jsx_runtime.jsx(QuizIcon, { size: props.wide ? 16 : 18 }),',
  '\t\t\t\t\tprops.wide && react_jsx_runtime.jsx("span", { children: "AI 刷题" })',
  '\t\t\t\t]',
  '\t\t\t});',
  '\t\t}',
  '',
  '\t\t/* ---- 全屏浮层 ---- */',
  '\t\tfunction QuizOverlay() {',
  '\t\t\tconst isOpen = react.useSyncExternalStore(subscribe, getOpen);',
  '\t\t\treact.useEffect(() => {',
  '\t\t\t\tif (!isOpen) return;',
  '\t\t\t\tconst onKey = (e) => { if (e.key === "Escape") setOpen(false); };',
  '\t\t\t\twindow.addEventListener("keydown", onKey);',
  '\t\t\t\treturn () => window.removeEventListener("keydown", onKey);',
  '\t\t\t}, [isOpen]);',
  '\t\t\tif (!isOpen) return null;',
  '\t\t\treturn react_jsx_runtime.jsx("div", {',
  '\t\t\t\tstyle: { position: "absolute", inset: 0, zIndex: 60, background: "rgba(8, 12, 22, 0.55)",',
  '\t\t\t\t\tdisplay: "flex", alignItems: "center", justifyContent: "center", padding: 24 },',
  '\t\t\t\tonClick: () => setOpen(false),',
  '\t\t\t\tchildren: react_jsx_runtime.jsx("div", {',
  '\t\t\t\t\tonClick: (e) => e.stopPropagation(),',
  '\t\t\t\t\tstyle: { width: "min(1280px, 100%)", height: "min(92vh, 980px)", background: "var(--dsw-alias-bg-base)",',
  '\t\t\t\t\t\tborder: "1px solid var(--dsw-alias-border-l2)", borderRadius: 14, overflow: "hidden",',
  '\t\t\t\t\t\tdisplay: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.45)" },',
  '\t\t\t\t\tchildren: [',
  '\t\t\t\t\t\treact_jsx_runtime.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between",',
  '\t\t\t\t\t\t\tpadding: "10px 14px", borderBottom: "1px solid var(--dsw-alias-border-l1)", flex: "none" },',
  '\t\t\t\t\t\t\tchildren: [',
  '\t\t\t\t\t\t\t\treact_jsx_runtime.jsxs("span", { style: { display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: "var(--dsw-alias-label-primary)" },',
  '\t\t\t\t\t\t\t\t\tchildren: [react_jsx_runtime.jsx(QuizIcon, { size: 18 }), "AI 岗刷题 · 笔试面试"] }),',
  '\t\t\t\t\t\t\t\treact_jsx_runtime.jsx("button", { type: "button", "aria-label": "关闭", title: "关闭（Esc）",',
  '\t\t\t\t\t\t\t\t\tonClick: () => setOpen(false),',
  '\t\t\t\t\t\t\t\t\tstyle: { appearance: "none", background: "transparent", border: "none", cursor: "pointer",',
  '\t\t\t\t\t\t\t\t\t\tcolor: "var(--dsw-alias-label-secondary)", fontSize: 16, padding: "4px 10px", borderRadius: 8 },',
  '\t\t\t\t\t\t\t\t\tchildren: "✕" })',
  '\t\t\t\t\t\t] }),',
  '\t\t\t\t\t\treact_jsx_runtime.jsx("iframe", {',
  '\t\t\t\t\t\t\ttitle: "AI 岗刷题", srcDoc: APP_HTML,',
  '\t\t\t\t\t\t\tsandbox: "allow-scripts allow-same-origin allow-modals allow-forms allow-downloads",',
  '\t\t\t\t\t\t\tstyle: { flex: 1, border: "none", width: "100%", background: "#fff" }',
  '\t\t\t\t\t\t})',
  '\t\t\t\t\t]',
  '\t\t\t\t})',
  '\t\t\t});',
  '\t\t}',
  '',
  '\t\t/* ---- 插件声明 ---- */',
  '\t\tconst inject = ["slots"];',
  '\t\tfunction apply(ctx) {',
  '\t\t\tctx.effect(() => ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({',
  '\t\t\t\tname: "sidebar.footer.action",',
  '\t\t\t\tid: "interview-kit.footer",',
  '\t\t\t\tpriority: 20,',
  '\t\t\t\torder: 30',
  '\t\t\t}, FooterAction)), "interview-kit: footer action");',
  '\t\t\tctx.effect(() => ctx.slots.inject("shell.overlay", () => ctx.slots.register({',
  '\t\t\t\tname: "shell.overlay",',
  '\t\t\t\tid: "interview-kit.overlay",',
  '\t\t\t\tpriority: 20',
  '\t\t\t}, QuizOverlay)), "interview-kit: overlay");',
  '\t\t}',
  '\t\texports.apply = apply;',
  '\t\texports.inject = inject;',
  '\t\treturn module.exports;',
  '\t}',
  '});',
  ''
].join("\n");
writeFileSync(join(pluginDir, "dist", "client.js"), clientBundle);

console.log("✓ 构建完成");
console.log("  - " + join(distDir, "interview-kit.html") + "（" + (Buffer.byteLength(html, "utf8") / 1024).toFixed(1) + " KB）");
console.log("  - " + join(pluginDir, "dist", "client.js") + "（" + (Buffer.byteLength(clientBundle, "utf8") / 1024).toFixed(1) + " KB）");
console.log("  - " + join(pluginDir, "dist", "index.js"));
