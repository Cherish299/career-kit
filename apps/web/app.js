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

function setValue(id, value) {
  const node = el(id);
  if (node) node.value = value;
}

/* ---------- 通用：填充下拉 ---------- */
async function fillSelect(id, rows, labelFn) {
  const sel = el(id);
  const cur = sel.value;
  sel.innerHTML = rows.map((r) => `<option value="${esc(r.id)}">${esc(labelFn(r))}</option>`).join("");
  if (rows.some((r) => r.id === cur)) sel.value = cur;
}

async function refreshDropdowns() {
  const [profiles, jobs, apps] = await Promise.all([api("/profiles"), api("/jobs"), api("/applications")]);
  fillSelect("mProfile", profiles, (p) => p.display_name || p.id.slice(0, 8));
  fillSelect("mJob", jobs, (j) => `${j.title || "未命名岗位"} @ ${j.company_name || "无公司"}`);
  fillSelect("pProfile", profiles, (p) => p.display_name || p.id.slice(0, 8));
  fillSelect("pJob", jobs, (j) => j.title || j.id.slice(0, 8));
  fillSelect("rProfile", profiles, (p) => p.display_name || p.id.slice(0, 8));
  fillSelect("rJob", jobs, (j) => j.title || j.id.slice(0, 8));
  fillSelect("iApplication", apps, (a) => `${STATUS_DISPLAY[a.status] || a.status} · ${a.job_id.slice(0, 8)}`);
  return { profiles, jobs, apps };
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

function splitPublicFields(value) {
  return String(value || "").split(/[;,，；\s]+/).map((item) => item.trim()).filter(Boolean);
}

async function renderProfiles() {
  const profiles = await api("/profiles");
  el("profileList").innerHTML = profiles.length
    ? profiles.map((p) => `
      <div class="list-item">
        <b>${esc(p.display_name)}</b>
        <span class="muted">${p.experiences.length} 条经历 · ${p.skills.length} 项技能 · 可见性 ${esc(p.visibility)}</span>
        <span class="muted">公开 slug：${esc(p.public_slug || "未生成")} · 公开字段：${esc((p.public_fields || []).join(", ") || "未设置")}</span>
      </div>`).join("")
    : '<div class="muted">暂无画像，先导入 Resume Kit JSON。</div>';

  fillSelect("publicProfileSelect", profiles, (p) => `${p.display_name || p.id.slice(0, 8)} · ${p.public_slug || "未生成 slug"}`);
  syncPublicProfileForm(profiles);
}

function syncPublicProfileForm(profiles) {
  const selectedId = el("publicProfileSelect").value;
  const profile = profiles.find((item) => item.id === selectedId) || profiles[0];
  if (!profile) return;
  el("publicProfileSelect").value = profile.id;
  el("publicSlugInput").value = profile.public_slug || "";
  el("publicVisibilitySelect").value = profile.visibility || "private";
  el("publicFieldsInput").value = (profile.public_fields || []).join(",");
}

async function savePublicProfileSettings() {
  const profileId = el("publicProfileSelect").value;
  if (!profileId) return toast("请先选择画像", "err");
  const payload = {
    public_slug: el("publicSlugInput").value.trim(),
    visibility: el("publicVisibilitySelect").value,
    public_fields: splitPublicFields(el("publicFieldsInput").value),
  };
  try {
    await api(`/profiles/${encodeURIComponent(profileId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    toast("公开设置已保存");
    await renderProfiles();
  } catch (err) {
    toast("保存失败：" + err.message, "err");
  }
}

async function loadPublicProfile() {
  const slug = el("publicSlugInput").value.trim();
  if (!slug) return toast("请先输入公开 slug", "err");
  try {
    const data = await api(`/profiles/public/${encodeURIComponent(slug)}`);
    const currentProfileId = el("publicProfileSelect")?.value;
    if (currentProfileId) {
      const currentProfile = (await api("/profiles")).find((item) => item.id === currentProfileId);
      if (currentProfile) {
        el("publicVisibilitySelect").value = currentProfile.visibility || "private";
        el("publicFieldsInput").value = (currentProfile.public_fields || []).join(",");
      }
    }
    el("publicProfileResult").innerHTML = `
      <div class="ok">公开主页可访问：${esc(data.display_name || slug)}</div>
      <div><b>${esc(data.display_name)}</b></div>
      <div class="muted">${esc(data.summary || "")}</div>
      <div class="muted">项目 ${data.experiences.length} 条 · 技能 ${data.skills.length} 项</div>
      <div class="row"><a class="btn" href="/public/${encodeURIComponent(slug)}" target="_blank" rel="noreferrer">打开独立公开页</a></div>
      <pre class="code-block">${esc(JSON.stringify(data, null, 2))}</pre>`;
  } catch (err) {
    toast("公开页加载失败：" + err.message, "err");
  }
}

/* ---------- 岗位 ---------- */
async function addJob() {
  const payload = {
    title: el("jTitle").value.trim(),
    location: el("jLocation").value.trim(),
    deadline: el("jDeadline").value.trim(),
    source_url: el("jUrl").value.trim(),
    requirements: el("jReq").value.trim(),
    source: el("jUrl").value.trim() ? "url" : "manual",
    company_name: el("jCompany").value.trim(),
  };
  if (!payload.title) return toast("请填写职位名称", "err");
  try {
    await api("/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    el("jTitle").value = ""; el("jReq").value = ""; el("jUrl").value = ""; el("jDeadline").value = "";
    toast("岗位已保存");
    renderJobs(); refreshDropdowns();
  } catch (err) { toast("保存失败：" + err.message, "err"); }
}

async function renderJobs() {
  const favorite = el("jobFavoriteOnly")?.checked;
  const query = favorite ? "?favorite=true" : "";
  const jobs = await api("/jobs" + query);
  el("jobList").innerHTML = jobs.length
    ? jobs.map((j) => `<div class="list-item"><b>${esc(j.title)}</b> <span class="muted">${esc(j.company_name || "无公司")} · ${esc(j.location)} · ${esc(j.source)} · ${esc(j.status)}${j.deadline ? ` · 截止 ${esc(j.deadline)}` : ""}</span><button class="btn small" data-fav-job="${esc(j.id)}">${j.is_favorite ? "★ 已收藏" : "☆ 收藏"}</button></div>`).join("")
    : '<div class="muted">暂无岗位，先录入 JD。</div>';
  document.querySelectorAll("[data-fav-job]").forEach((button) => {
    button.onclick = async () => {
      try {
        await api(`/jobs/${button.dataset.favJob}/favorite`, { method: "PATCH" });
        renderJobs();
        renderJobAlerts();
        refreshDropdowns();
      } catch (err) { toast("收藏失败：" + err.message, "err"); }
    };
  });
}

async function renderJobAlerts() {
  const alerts = await api("/jobs/alerts?unread_only=true");
  el("jobAlertList").innerHTML = alerts.length
    ? alerts.map((a) => `<div class="list-item"><b>${esc(a.type)}</b> <span class="muted">${esc(a.job_title || a.job_id)} · ${esc(a.message)}</span><button class="btn small" data-alert-id="${esc(a.id)}">标记已读</button></div>`).join("")
    : '<div class="muted">暂无未读提醒。</div>';
  document.querySelectorAll("[data-alert-id]").forEach((button) => {
    button.onclick = async () => {
      try {
        await api(`/jobs/alerts/${button.dataset.alertId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ read: true }),
        });
        renderJobAlerts();
      } catch (err) { toast("提醒更新失败：" + err.message, "err"); }
    };
  });
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

async function generateInterviewPlan() {
  const applicationId = el("iApplication").value;
  if (!applicationId) return toast("请先选择投递记录", "err");
  try {
    const data = await api(`/interview-plans/generate?application_id=${encodeURIComponent(applicationId)}`, { method: "POST" });
    el("interviewPlanResult").innerHTML = `
      <div class="ok">已生成面试准备计划</div>
      <div class="muted">主题 ${data.topics.length} 项 · 问题 ${data.questions.length} 题</div>
      <pre class="code-block">${esc(JSON.stringify(data, null, 2))}</pre>`;
  } catch (err) {
    toast("生成失败：" + err.message, "err");
  }
}

/* ---------- Offer 导入 ---------- */
const OFFER_STORAGE_KEY = "careeros.offer.filters.v1";

function collectOfferConfig() {
  return {
    navigationNames: el("oNavigationNames").value.trim(),
    titleKeywords: el("oTitleKeywords").value.trim(),
    jobKeywords: el("oJobKeywords").value.trim(),
    companyKeywords: el("oCompanyKeywords").value.trim(),
    locationKeywords: el("oLocationKeywords").value.trim(),
    graduateYears: el("oGraduateYears").value.trim(),
    batchKeywords: el("oBatchKeywords").value.trim(),
    limit: el("oLimit").value.trim() || "20",
    pageLimit: el("oPageLimit").value.trim() || "1",
    totalLimit: el("oTotalLimit").value.trim() || "20",
    reportFormat: el("oReportFormat").value,
    outputPath: el("oOutputPath").value.trim(),
    autoName: el("oAutoName").checked,
  };
}

function buildOfferCommand(mode) {
  const cfg = collectOfferConfig();
  const lines = ["cd services/crawler"];
  const envPairs = [
    ["OFFER_PREVIEW_LIMIT", mode === "preview" ? cfg.limit : ""],
    ["OFFER_IMPORT_LIMIT", mode === "import" ? cfg.limit : ""],
    ["OFFER_PAGE_LIMIT", cfg.pageLimit],
    ["OFFER_TOTAL_LIMIT", cfg.totalLimit],
    ["OFFER_NAVIGATION_NAMES", cfg.navigationNames],
    ["OFFER_TITLE_KEYWORDS", cfg.titleKeywords],
    ["OFFER_JOB_KEYWORDS", cfg.jobKeywords],
    ["OFFER_COMPANY_KEYWORDS", cfg.companyKeywords],
    ["OFFER_LOCATION_KEYWORDS", cfg.locationKeywords],
    ["OFFER_GRADUATE_YEARS", cfg.graduateYears],
    ["OFFER_BATCH_KEYWORDS", cfg.batchKeywords],
    ["OFFER_REPORT_FORMAT", cfg.reportFormat],
  ];
  for (const [key, value] of envPairs) {
    if (value) lines.push(`$env:${key}="${value.replaceAll('"', '`"')}"`);
  }
  if (cfg.autoName) lines.push('$env:OFFER_REPORT_AUTO_NAME="1"');
  const outputArg = cfg.outputPath ? ` -- --output=${cfg.outputPath}` : "";
  lines.push(mode === "preview" ? `npm run preview:offer${outputArg}` : "npm run import:offer");
  return lines.join("\n");
}

async function previewOfferInPage() {
  const cfg = collectOfferConfig();
  persistOfferConfig();
  try {
    const payload = {
      limit: Number(cfg.limit || 20),
      page_limit: Number(cfg.pageLimit || 1),
      total_limit: Number(cfg.totalLimit || 20),
      navigation_names: splitCsv(cfg.navigationNames),
      title_keywords: splitCsv(cfg.titleKeywords),
      any_keywords: splitCsv(cfg.jobKeywords),
      company_keywords: splitCsv(cfg.companyKeywords),
      location_keywords: splitCsv(cfg.locationKeywords),
      graduate_years: splitCsv(cfg.graduateYears),
      batch_keywords: splitCsv(cfg.batchKeywords),
      report_format: cfg.reportFormat,
    };
    const data = await api("/offer/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (data.report_text) {
      el("offerResult").innerHTML = `<div class="ok">已完成页面预览（${esc(String(data.count))} 条）</div><pre class="code-block">${esc(data.report_text)}</pre>`;
    } else {
      el("offerResult").innerHTML = `<div class="ok">已完成页面预览（${esc(String(data.count))} 条）</div><pre class="code-block">${esc(JSON.stringify(data, null, 2))}</pre>`;
    }
  } catch (err) {
    toast("预览失败：" + err.message, "err");
  }
}

async function writeOfferJobs() {
  const cfg = collectOfferConfig();
  persistOfferConfig();
  try {
    const payload = {
      limit: Number(cfg.limit || 20),
      page_limit: Number(cfg.pageLimit || 1),
      total_limit: Number(cfg.totalLimit || 20),
      navigation_names: splitCsv(cfg.navigationNames),
      title_keywords: splitCsv(cfg.titleKeywords),
      any_keywords: splitCsv(cfg.jobKeywords),
      company_keywords: splitCsv(cfg.companyKeywords),
      location_keywords: splitCsv(cfg.locationKeywords),
      graduate_years: splitCsv(cfg.graduateYears),
      batch_keywords: splitCsv(cfg.batchKeywords),
      report_format: cfg.reportFormat,
    };
    const data = await api("/offer/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    el("offerImportSummary").innerHTML = `<div class="ok">已完成正式导入：新增 ${esc(String(data.summary.created || 0))}，复用 ${esc(String(data.summary.reused || 0))}，失败 ${esc(String(data.summary.failed || 0))}，公司 ${esc(String(data.summary.companies || 0))}</div><pre class="code-block">${esc(JSON.stringify(data, null, 2))}</pre>`;
    toast("正式导入已完成");
  } catch (err) {
    toast("导入失败：" + err.message, "err");
  }
}

async function downloadOfferReport() {
  const cfg = collectOfferConfig();
  persistOfferConfig();
  try {
    const payload = {
      limit: Number(cfg.limit || 20),
      page_limit: Number(cfg.pageLimit || 1),
      total_limit: Number(cfg.totalLimit || 20),
      navigation_names: splitCsv(cfg.navigationNames),
      title_keywords: splitCsv(cfg.titleKeywords),
      any_keywords: splitCsv(cfg.jobKeywords),
      company_keywords: splitCsv(cfg.companyKeywords),
      location_keywords: splitCsv(cfg.locationKeywords),
      graduate_years: splitCsv(cfg.graduateYears),
      batch_keywords: splitCsv(cfg.batchKeywords),
      report_format: cfg.reportFormat,
    };
    const data = await api("/offer/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = data.report_text || JSON.stringify(data, null, 2);
    const ext = cfg.reportFormat === "markdown" ? "md" : cfg.reportFormat;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `offer-report.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast("报告已开始下载");
  } catch (err) {
    toast("下载失败：" + err.message, "err");
  }
}

function renderOfferCommand(mode) {
  const command = buildOfferCommand(mode);
  el("offerResult").innerHTML = `<div class="ok">已生成${mode === "preview" ? "预览" : "导入"}命令</div><pre class="code-block">${esc(command)}</pre>`;
  el("offerResult").dataset.command = command;
}

async function copyOfferCommand() {
  const command = el("offerResult").dataset.command;
  if (!command) return toast("请先生成命令", "err");
  try {
    await navigator.clipboard.writeText(command);
    toast("命令已复制");
  } catch (err) {
    toast("复制失败：" + err.message, "err");
  }
}

function initOfferForm() {
  const saved = loadOfferConfig();
  setValue("oTitleKeywords", saved.titleKeywords || "AI,算法,机器学习,后端");
  setValue("oJobKeywords", saved.jobKeywords || "大模型,RAG,Python,数据,Agent");
  setValue("oCompanyKeywords", saved.companyKeywords || "乐狗,华为,百度,腾讯,阿里");
  setValue("oLocationKeywords", saved.locationKeywords || "杭州,深圳,全国");
  setValue("oGraduateYears", saved.graduateYears || "2027,2028");
  setValue("oBatchKeywords", saved.batchKeywords || "秋招,实习");
  setValue("oOutputPath", saved.outputPath || "tmp/offer-report.csv");
  setValue("oLimit", saved.limit || "20");
  setValue("oPageLimit", saved.pageLimit || "1");
  setValue("oTotalLimit", saved.totalLimit || "20");
  if (saved.reportFormat) el("oReportFormat").value = saved.reportFormat;
  el("oAutoName").checked = Boolean(saved.autoName);
}

function loadOfferConfig() {
  try {
    return JSON.parse(localStorage.getItem(OFFER_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function persistOfferConfig() {
  localStorage.setItem(OFFER_STORAGE_KEY, JSON.stringify(collectOfferConfig()));
}

async function loadOfferNavigations() {
  try {
    const response = await fetch("/api/offer/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 1, report_format: "json" }),
    });
    if (!response.ok) return;
    const saved = loadOfferConfig();
    const select = el("oNavigationNames");
    const options = ["信息总表", "实习"].map((name) => `<option value="${esc(name)}">${esc(name)}</option>`).join("");
    select.innerHTML = `<option value="">请选择导航</option>${options}`;
    select.value = saved.navigationNames || "信息总表";
  } catch {
    const select = el("oNavigationNames");
    select.innerHTML = `<option value="信息总表">信息总表</option><option value="实习">实习</option>`;
    select.value = "信息总表";
  }
}

function splitCsv(value) {
  return String(value || "").split(/[;,，；\n]+/).map((item) => item.trim()).filter(Boolean);
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
  initOfferForm();
  await loadOfferNavigations();
  el("btnImport").onclick = importProfile;
  el("btnSavePublicProfile").onclick = savePublicProfileSettings;
  el("btnLoadPublicProfile").onclick = loadPublicProfile;
  el("publicProfileSelect").onchange = () => renderProfiles();
  el("btnAddJob").onclick = addJob;
  el("btnRefreshJobs").onclick = renderJobs;
  el("btnRefreshAlerts").onclick = renderJobAlerts;
  el("jobFavoriteOnly").onchange = renderJobs;
  el("btnMatch").onclick = runMatch;
  el("btnAddApp").onclick = addApplication;
  el("btnFork").onclick = forkResume;
  el("btnGenerateInterview").onclick = generateInterviewPlan;
  el("btnOfferPreview").onclick = previewOfferInPage;
  el("btnOfferDownload").onclick = downloadOfferReport;
  el("btnOfferWrite").onclick = writeOfferJobs;
  el("btnOfferPreviewCmd").onclick = () => renderOfferCommand("preview");
  el("btnOfferImport").onclick = () => renderOfferCommand("import");
  el("btnOfferCopy").onclick = copyOfferCommand;
  el("importFile").addEventListener("change", async () => {
    const file = el("importFile").files[0];
    if (file) el("importText").value = await file.text();
  });
  try {
    await refreshDropdowns();
    renderProfiles(); renderJobs(); renderJobAlerts(); renderPipeline(); renderResumeVersions();
  } catch (err) {
    toast("后端未就绪：" + err.message, "err");
  }
}
document.addEventListener("DOMContentLoaded", init);
