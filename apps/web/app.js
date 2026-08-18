/* CareerOS 工作台前端（原生 JS，零构建依赖，直接对接 FastAPI） */
"use strict";

const API = "/api";

async function api(path, options) {
  const res = await fetch(API + path, options);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(res.status + " " + body.slice(0, 300));
  }
  if (res.status === 204) return null;
  return res.json();
}

function el(id) { return document.getElementById(id); }
function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function toast(msg, kind) {
  const t = document.createElement("div");
  t.className = "toast" + (kind === "err" ? " err" : "");
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

/* ---------- 通用：填充下拉 ---------- */
async function fillSelect(id, rows, labelFn) {
  const sel = el(id);
  const cur = sel.value;
  sel.innerHTML = rows.map((r) => `<option value="${esc(r.id)}">${esc(labelFn(r))}</option>`).join("");
  if (rows.some((r) => r.id === cur)) sel.value = cur;
}

async function refreshDropdowns() {
  const [profiles, jobs] = await Promise.all([api("/profiles"), api("/jobs")]);
  fillSelect("mProfile", profiles, (p) => p.display_name || p.id.slice(0, 8));
  fillSelect("mJob", jobs, (j) => `${j.title || "未命名岗位"} @ ${j.company_id || "无公司"}`);
  fillSelect("pProfile", profiles, (p) => p.display_name || p.id.slice(0, 8));
  fillSelect("pJob", jobs, (j) => j.title || j.id.slice(0, 8));
  fillSelect("rProfile", profiles, (p) => p.display_name || p.id.slice(0, 8));
  fillSelect("rJob", jobs, (j) => j.title || j.id.slice(0, 8));
  return { profiles, jobs };
}

/* ---------- 个人中心 ---------- */
async function importProfile() {
  let text = el("importText").value.trim();
  if (!text) {
    const file = el("importFile").files[0];
    if (!file) return toast("请粘贴 JSON 或选择文件", "err");
    text = await file.text();
  }
  let payload;
  try { payload = JSON.parse(text); } catch { return toast("JSON 解析失败", "err"); }
  try {
    const p = await api("/profiles", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume_json: payload }),
    });
    el("importResult").innerHTML = `<div class="ok">✅ 导入成功：${esc(p.display_name)}（教育 ${p.experiences.filter(e => e.type === "education").length} / 实习 ${p.experiences.filter(e => e.type === "internship").length} / 项目 ${p.experiences.filter(e => e.type === "project").length} / 技能 ${p.skills.length}）</div>`;
    toast("画像已导入");
    renderProfiles();
    refreshDropdowns();
  } catch (err) { toast("导入失败：" + err.message, "err"); }
}

async function renderProfiles() {
  const profiles = await api("/profiles");
  el("profileList").innerHTML = profiles.length
    ? profiles.map((p) => `
      <div class="list-item">
        <b>${esc(p.display_name)}</b>
        <span class="muted">${p.experiences.length} 条经历 · ${p.skills.length} 项技能 · 可见性 ${esc(p.visibility)}</span>
        <span class="muted">偏好：${(p.preference ? p.preference.roles : []).join("、") || "未设置"}</span>
      </div>`).join("")
    : '<div class="muted">暂无画像，先导入 Resume Kit JSON。</div>';
}

/* ---------- 岗位 ---------- */
async function addJob() {
  const payload = {
    title: el("jTitle").value.trim(),
    location: el("jLocation").value.trim(),
    source_url: el("jUrl").value.trim(),
    requirements: el("jReq").value.trim(),
    source: el("jUrl").value.trim() ? "url" : "manual",
    company_name: el("jCompany").value.trim(),
  };
  if (!payload.title) return toast("请填写职位名称", "err");
  try {
    await api("/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    el("jTitle").value = ""; el("jReq").value = ""; el("jUrl").value = "";
    toast("岗位已保存");
    renderJobs(); refreshDropdowns();
  } catch (err) { toast("保存失败：" + err.message, "err"); }
}

async function renderJobs() {
  const jobs = await api("/jobs");
  el("jobList").innerHTML = jobs.length
    ? jobs.map((j) => `<div class="list-item"><b>${esc(j.title)}</b> <span class="muted">${esc(j.location)} · ${esc(j.source)}</span></div>`).join("")
    : '<div class="muted">暂无岗位，先录入 JD。</div>';
}

/* ---------- 匹配 ---------- */
async function runMatch() {
  const pid = el("mProfile").value, jid = el("mJob").value;
  if (!pid || !jid) return toast("请选择画像与岗位", "err");
  try {
    const r = await api(`/matches/analyze?profile_id=${pid}&job_id=${jid}`, { method: "POST" });
    const scores = r.scores || {};
    el("matchResult").innerHTML = `
      <div class="score-card ${r.blocked ? "blocked" : ""}">
        <div class="score-num">${scores.total ?? "—"}<span>/${(scores.hard_max || 30) + (scores.keyword_max || 20)}</span></div>
        <div class="score-label">${r.blocked ? "⛔ 硬条件阻塞" : "匹配总分"}</div>
        <div class="score-bars">
          <div>硬条件 ${scores.hard ?? 0}/${scores.hard_max ?? 30}<i style="width:${((scores.hard ?? 0) / (scores.hard_max || 30)) * 100}%"></i></div>
          <div>关键词 ${scores.keyword ?? 0}/${scores.keyword_max ?? 20}<i style="width:${((scores.keyword ?? 0) / (scores.keyword_max || 20)) * 100}%"></i></div>
        </div>
      </div>
      <div class="two-col">
        <div class="col ok-col"><b>✅ 优势</b><ul>${(r.strengths || []).map(s => `<li>${esc(s)}</li>`).join("") || "<li class='muted'>无</li>"}</ul></div>
        <div class="col gap-col"><b>⚠️ 缺口</b><ul>${(r.gaps || []).map(g => `<li>${esc(g)}</li>`).join("") || "<li class='muted'>无</li>"}</ul></div>
      </div>
      <details class="evidence"><summary>证据明细（${(r.evidence || []).length}）</summary>
        ${(r.evidence || []).map(e => `<div class="evi ${e.in_profile ? "hit" : "miss"}">${esc(e.keyword)} → ${e.in_profile ? "画像已覆盖 ✓" : "画像未覆盖 ✗"}</div>`).join("") || "无"}
      </details>`;
  } catch (err) { toast("匹配失败：" + err.message, "err"); }
}

/* ---------- 投递 ---------- */
async function addApplication() {
  const pid = el("pProfile").value, jid = el("pJob").value;
  if (!pid || !jid) return toast("请选择画像与岗位", "err");
  try {
    await api("/applications", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: pid, job_id: jid, status: "discovered" }),
    });
    toast("投递已创建");
    renderPipeline();
  } catch (err) { toast("创建失败：" + err.message, "err"); }
}

const STATUS_DISPLAY = {
  discovered: "发现", favorited: "收藏", to_submit: "待投递", submitted: "已投递",
  written_test: "笔试", interview_1: "一面", interview_next: "后续面试",
  offer: "Offer", rejected: "拒绝", abandoned: "放弃",
};
const NEXT_ACTIONS = {
  discovered: ["favorited", "to_submit", "abandoned"],
  favorited: ["to_submit", "abandoned"],
  to_submit: ["submitted", "abandoned"],
  submitted: ["written_test", "interview_1", "rejected"],
  written_test: ["interview_1", "rejected"],
  interview_1: ["interview_next", "offer", "rejected"],
  interview_next: ["offer", "rejected"],
};

async function renderPipeline() {
  const apps = await api("/applications");
  el("pipelineList").innerHTML = apps.length
    ? apps.map((a) => `
      <div class="list-item">
        <b>${esc(STATUS_DISPLAY[a.status] || a.status)}</b>
        <span class="muted">${a.job_id.slice(0, 8)} · 事件 ${a.events.length} 条</span>
        <select data-app="${esc(a.id)}">${(NEXT_ACTIONS[a.status] || []).map(s => `<option value="${s}">→ ${esc(STATUS_DISPLAY[s] || s)}</option>`).join("") || "<option>终态</option>"}</select>
      </div>`).join("")
    : '<div class="muted">暂无投递记录。</div>';
  document.querySelectorAll("[data-app]").forEach((sel) => {
    sel.onchange = async () => {
      try {
        await api(`/applications/${sel.dataset.app}/status`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to_status: sel.value }),
        });
        toast("状态已更新");
        renderPipeline();
      } catch (err) { toast("状态转换失败：" + err.message, "err"); renderPipeline(); }
    };
  });
}

/* ---------- 简历版本 ---------- */
async function forkResume() {
  const pid = el("rProfile").value, jid = el("rJob").value;
  if (!pid) return toast("请选择画像", "err");
  try {
    const versions = await api(`/resume-versions?profile_id=${pid}`);
    const master = versions[0];
    if (!master) return toast("该画像暂无母版，先创建（后续支持）", "err");
    const params = new URLSearchParams();
    if (jid) params.set("job_id", jid);
    if (el("rName").value.trim()) params.set("name", el("rName").value.trim());
    const fork = await api(`/resume-versions/${master.id}/fork?${params}`, { method: "POST" });
    el("resumeResult").innerHTML = `<div class="ok">✅ 已生成副本「${esc(fork.name)}」（parent: ${esc(fork.parent_id.slice(0, 8))}）</div>`;
    toast("副本已生成");
    renderResumeVersions();
  } catch (err) { toast("生成失败：" + err.message, "err"); }
}

async function renderResumeVersions() {
  const versions = await api("/resume-versions");
  el("resumeList").innerHTML = versions.length
    ? versions.map((v) => `<div class="list-item"><b>${esc(v.name || v.id.slice(0, 8))}</b> <span class="muted">job: ${esc(v.job_id || "—")} · parent: ${esc(v.parent_id ? v.parent_id.slice(0, 8) : "母版")}</span></div>`).join("")
    : '<div class="muted">暂无简历版本。</div>';
}

/* ---------- 初始化 ---------- */
function bindTabs() {
  el("tabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".tab");
    if (!btn) return;
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === btn));
    document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.id === "panel-" + btn.dataset.tab));
  });
}

async function init() {
  bindTabs();
  el("btnImport").onclick = importProfile;
  el("btnAddJob").onclick = addJob;
  el("btnMatch").onclick = runMatch;
  el("btnAddApp").onclick = addApplication;
  el("btnFork").onclick = forkResume;
  el("importFile").addEventListener("change", async () => {
    const file = el("importFile").files[0];
    if (file) el("importText").value = await file.text();
  });
  try {
    await refreshDropdowns();
    renderProfiles(); renderJobs(); renderPipeline(); renderResumeVersions();
  } catch (err) {
    toast("后端未就绪：" + err.message, "err");
  }
}
document.addEventListener("DOMContentLoaded", init);
