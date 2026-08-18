/* app.js — 简历工作台主逻辑（校招版）
 * 依赖：templates.js / engine.js / export.js / ai.js / builtin-single-file.js（可选）
 */
(function () {
  "use strict";

  var T = window.RESUME_TEMPLATES || {};
  var Engine = window.ResumeEngine;
  var Ex = window.ResumeExport;
  var AI = window.ResumeAI;

  var STORE_KEY = "resumeKit:state:v1";
  var THEME_KEY = "resumeKit:theme";

  /* ---------- 小工具 ---------- */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  var uidCounter = 0;
  function uid() { return "id" + (++uidCounter) + "_" + Date.now().toString(36); }

  function hasText(v) { return typeof v === "string" && v.trim().length > 0; }
  function j(v) { return (v == null ? "" : String(v)).trim(); }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function debounce(fn, ms) {
    var t = null;
    return function () {
      var args = arguments, self = this;
      if (t) clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  }

  /* ---------- 存储适配（file:// 下 localStorage 可能受限，降级内存） ---------- */
  var memStore = {};
  var storageOK = true;
  try {
    var probe = "__resume_kit_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
  } catch (e) { storageOK = false; }

  function storeGet(key) {
    if (storageOK) { try { return window.localStorage.getItem(key); } catch (e) { /* fallthrough */ } }
    return memStore[key] || null;
  }
  function storeSet(key, val) {
    memStore[key] = val;
    if (storageOK) { try { window.localStorage.setItem(key, val); } catch (e) { /* ignore */ } }
  }

  /* ---------- 数据模型 ---------- */

  function emptyResume() {
    return {
      basic: { name: "", gender: "", birth: "", phone: "", email: "", city: "", website: "", github: "", photo: "" },
      target: { position: "", industry: "", city: "", salary: "", availability: "", jobType: "校招" },
      education: [],
      internships: [],
      projects: [],
      campus: [],
      research: [],
      awards: [],
      skills: [],
      evaluation: "",
      extra: ""
    };
  }

  function defaultState() {
    return {
      resume: emptyResume(),
      templateId: "tech",
      style: "blue",
      sections: { order: templateOrder(T.tech), hidden: {} },
      tracker: [],
      checklist: JSON.parse(JSON.stringify(window.RESUME_CHECKLIST_DEFAULT || [])),
      updatedAt: 0
    };
  }

  /* ---------- 板块管理（顺序 + 隐藏） ---------- */

  /* 模板 sectionOrder 使用单数 key（internship/project/award/skill），统一映射到数据 key */
  var KEY_MAP = { internship: "internships", project: "projects", award: "awards", skill: "skills" };
  /* 可管理的板块（基本信息固定置顶，不可隐藏/移动） */
  var CANONICAL_ORDER = ["target", "education", "internships", "projects", "campus", "research", "awards", "skills", "evaluation", "extra"];

  /* 由模板顺序导出规范板块顺序（保证覆盖全部板块） */
  function templateOrder(tpl) {
    var src = (tpl && tpl.sectionOrder) || [];
    var order = src.map(function (k) { return KEY_MAP[k] || k; })
      .filter(function (k) { return CANONICAL_ORDER.indexOf(k) >= 0; });
    CANONICAL_ORDER.forEach(function (k) { if (order.indexOf(k) < 0) order.push(k); });
    return order;
  }

  function sectionOrder() {
    return (state.sections && state.sections.order) || CANONICAL_ORDER.slice();
  }
  function isSectionHidden(key) {
    return !!(state.sections && state.sections.hidden && state.sections.hidden[key]);
  }
  /* 保证 resume 数据结构完整（兼容旧存档：补缺的数组/对象字段） */
  function ensureResumeShape() {
    var r = state.resume;
    ["education", "internships", "projects", "campus", "research", "awards", "skills"].forEach(function (k) {
      if (!Array.isArray(r[k])) r[k] = [];
    });
    if (!r.basic || typeof r.basic !== "object") r.basic = {};
    if (!r.target || typeof r.target !== "object") r.target = {};
    if (typeof r.evaluation !== "string") r.evaluation = "";
    if (typeof r.extra !== "string") r.extra = "";
  }
  /* 保证 sections 结构完整（兼容旧存档） */
  function normalizeSections() {
    var order = sectionOrder().filter(function (k) { return CANONICAL_ORDER.indexOf(k) >= 0; });
    CANONICAL_ORDER.forEach(function (k) { if (order.indexOf(k) < 0) order.push(k); });
    state.sections = { order: order, hidden: (state.sections && state.sections.hidden) || {} };
  }
  /* 剔除隐藏板块后的简历副本（用于 AI 请求等） */
  function visibleResume() {
    var r = JSON.parse(JSON.stringify(state.resume));
    CANONICAL_ORDER.forEach(function (k) { if (isSectionHidden(k)) delete r[k]; });
    return r;
  }

  function loadState() {
    try {
      var raw = storeGet(STORE_KEY);
      if (raw) {
        var d = JSON.parse(raw);
        if (d && d.resume) return Object.assign(defaultState(), d);
      }
    } catch (e) { /* ignore */ }
    var boot = window.__RESUME_KIT_BOOT_DATA__;
    if (boot && boot.resume) {
      var s = defaultState();
      s.resume = Object.assign(emptyResume(), boot.resume);
      return s;
    }
    return defaultState();
  }

  var state = loadState();
  var saveTimer = null;
  var lastSavedAt = 0;

  function saveState(force) {
    if (saveTimer && !force) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = null;
    state.updatedAt = Date.now();
    try {
      storeSet(STORE_KEY, JSON.stringify(state));
      lastSavedAt = Date.now();
      showSaveStatus("已自动保存 " + timeHM());
    } catch (e) {
      showSaveStatus("保存失败（存储不可用）");
    }
  }
  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { saveState(true); }, 400);
  }
  function timeHM() {
    var d = new Date();
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return p(d.getHours()) + ":" + p(d.getMinutes());
  }
  function showSaveStatus(text) {
    var el = $("#saveStatus");
    if (el) { el.textContent = text; el.classList.add("saved"); }
  }

  /* ---------- 表单 Schema ---------- */

  var BASIC_FIELDS = [
    { k: "name", label: "姓名", type: "text", ph: "张三" },
    { k: "gender", label: "性别", type: "select", options: ["", "男", "女"] },
    { k: "birth", label: "出生年月", type: "text", ph: "2002.06" },
    { k: "phone", label: "手机号", type: "tel", ph: "138****8888" },
    { k: "email", label: "邮箱", type: "email", ph: "name@example.com" },
    { k: "city", label: "所在城市", type: "text", ph: "北京" },
    { k: "website", label: "个人主页", type: "text", ph: "https://" },
    { k: "github", label: "GitHub", type: "text", ph: "github.com/yourname" }
  ];

  var TARGET_FIELDS = [
    { k: "position", label: "目标岗位", type: "text", ph: "后端开发工程师（校招）", req: true },
    { k: "industry", label: "意向行业", type: "text", ph: "互联网 / 国企 / 银行" },
    { k: "city", label: "意向城市", type: "text", ph: "北京 / 上海 / 深圳" },
    { k: "salary", label: "期望薪资", type: "text", ph: "15-20K" },
    { k: "availability", label: "可到岗时间", type: "text", ph: "2025.07 毕业后" },
    { k: "jobType", label: "求职类型", type: "select", options: ["校招", "实习转正", "实习"] }
  ];

  /* 全部可管理板块的定义（key 与数据字段一致） */
  var SECTION_DEFS = {
    target: { key: "target", title: "求职意向", tip: "校招建议填写目标岗位，HR 据此判断匹配度；不需要可隐藏", kind: "object", fields: TARGET_FIELDS },
    education: { key: "education", title: "教育背景", tip: "从最高学历写起", kind: "list", fields: [
      { k: "school", label: "学校", type: "text", ph: "XX大学", req: true },
      { k: "major", label: "专业", type: "text", ph: "计算机科学与技术", req: true },
      { k: "degree", label: "学历", type: "select", options: ["", "本科", "硕士", "博士", "大专"] },
      { k: "start", label: "入学时间", type: "month" },
      { k: "end", label: "毕业时间", type: "month" },
      { k: "gpa", label: "GPA", type: "text", ph: "3.7/4.0" },
      { k: "rank", label: "排名", type: "text", ph: "前 10%" },
      { k: "courses", label: "主修课程", type: "text", ph: "数据结构、操作系统、计算机网络", full: true },
      { k: "honors", label: "在校荣誉", type: "text", ph: "校级优秀学生、一等奖学金", full: true }
    ]},
    internships: { key: "internships", title: "实习经历", tip: "按「动作 + 规模 + 结果」写，尽量量化", kind: "list", fields: [
      { k: "company", label: "公司", type: "text", ph: "XX科技有限公司", req: true },
      { k: "title", label: "职位", type: "text", ph: "后端开发实习生", req: true },
      { k: "start", label: "开始时间", type: "month" },
      { k: "end", label: "结束时间", type: "month", now: true },
      { k: "content", label: "工作内容（每行一个要点）", type: "textarea", full: true, ph: "负责XX模块的开发，使用XX技术解决了XX问题，使XX提升XX%。" }
    ]},
    projects: { key: "projects", title: "项目经历", tip: "校招重点板块：背景 → 你的职责 → 难点 → 量化结果", kind: "list", fields: [
      { k: "name", label: "项目名称", type: "text", ph: "校园二手交易平台", req: true },
      { k: "role", label: "你的角色", type: "text", ph: "后端开发（负责人）" },
      { k: "tech", label: "技术栈", type: "text", ph: "Spring Boot + MySQL + Redis" },
      { k: "start", label: "开始时间", type: "month" },
      { k: "end", label: "结束时间", type: "month", now: true },
      { k: "content", label: "项目描述（每行一个要点）", type: "textarea", full: true, ph: "项目背景…\n我负责…\n结果：QPS/耗时/用户量…" }
    ]},
    campus: { key: "campus", title: "校园经历", tip: "社团/学生会/志愿活动，同样要量化", kind: "list", fields: [
      { k: "org", label: "组织/活动", type: "text", ph: "校学生会", req: true },
      { k: "role", label: "职务", type: "text", ph: "外联部部长" },
      { k: "start", label: "开始时间", type: "month" },
      { k: "end", label: "结束时间", type: "month", now: true },
      { k: "content", label: "内容（每行一个要点）", type: "textarea", full: true, ph: "组织XX活动，覆盖XX人…" }
    ]},
    research: { key: "research", title: "科研成果", tip: "论文/专利/软著/竞赛：写清类型、名称、你的位置与发表信息", kind: "list", fields: [
      { k: "kind", label: "类型", type: "select", options: ["", "论文", "专利", "软件著作权", "竞赛获奖", "其他"] },
      { k: "title", label: "名称", type: "text", ph: "论文标题 / 专利名称（如：一种基于XX的XX方法）", req: true },
      { k: "role", label: "你的位置", type: "text", ph: "第一作者 / 共同一作 / 第三作者 / 发明人（排序2）" },
      { k: "venue", label: "发表/授权信息", type: "text", ph: "期刊/会议名 + 分区或影响因子，如：IEEE TIP（SCI 一区）" },
      { k: "date", label: "时间", type: "month" },
      { k: "note", label: "补充说明", type: "textarea", full: true, ph: "如：影响因子 8.3、他引 12 次、已授权/实审中、获奖级别" }
    ]},
    awards: { key: "awards", title: "荣誉奖项", tip: "注明级别（校级/省级/国家级）更有分量", kind: "list", fields: [
      { k: "name", label: "奖项名称", type: "text", ph: "全国大学生数学建模竞赛", req: true },
      { k: "level", label: "级别", type: "select", options: ["", "国家级", "省级", "市级", "校级", "其他"] },
      { k: "date", label: "获奖时间", type: "month" }
    ]},
    skills: { key: "skills", title: "技能", tip: "按分类填写，如：语言/框架/工具/证书", kind: "list", fields: [
      { k: "category", label: "分类", type: "text", ph: "编程语言", req: true },
      { k: "items", label: "内容", type: "text", ph: "Java（熟练）、Python（掌握）、SQL（熟练）", req: true, full: true }
    ]},
    evaluation: { key: "evaluation", title: "自我评价", tip: "2-3 条与岗位相关的硬事实，别写空话", kind: "single", rows: 4, ph: "如：独立完成 3 个上线项目；LeetCode 300+；开源社区 contributor…" },
    extra: { key: "extra", title: "其他（可选）", tip: "作品集链接、补充说明等", kind: "single", rows: 3, ph: "补充说明" }
  };

  /* ---------- 表单渲染 ---------- */

  function fieldHTML(path, f, val) {
    var v = val == null ? "" : val;
    var req = f.req ? ' <span style="color:var(--danger)">*</span>' : "";
    var cls = f.full ? ' class="form-field full"' : ' class="form-field"';
    var label = '<label>' + esc(f.label) + req + '</label>';
    var inner = "";
    if (f.type === "select") {
      var opts = (f.options || []).map(function (o) {
        return '<option value="' + esc(o) + '"' + (String(v) === o ? " selected" : "") + ">" + esc(o || "（请选择）") + "</option>";
      }).join("");
      inner = '<select data-path="' + path + '">' + opts + "</select>";
    } else if (f.type === "textarea") {
      inner = '<textarea data-path="' + path + '" rows="4" placeholder="' + esc(f.ph || "") + '">' + esc(v) + "</textarea>";
    } else if (f.type === "month") {
      if (f.now && String(v) === "至今") {
        inner = '<span style="display:inline-flex;align-items:center;height:34px;padding:0 12px;border:1px solid var(--border);border-radius:8px;color:var(--text);background:var(--bg);font-size:13px">至今</span>' +
          '<button type="button" class="btn small ghost" data-now-off="' + path + '" style="margin-left:6px" title="改为选择具体日期">选日期</button>';
      } else {
        inner = '<input data-path="' + path + '" type="month" value="' + esc(v) + '">' +
          (f.now ? '<button type="button" class="btn small ghost" data-now-on="' + path + '" style="margin-left:6px" title="结束时间填至今">至今</button>' : "");
      }
    } else {
      inner = '<input data-path="' + path + '" type="' + (f.type || "text") + '" value="' + esc(v) + '" placeholder="' + esc(f.ph || "") + '">';
    }
    return '<div' + cls + ">" + label + inner + "</div>";
  }

  function listSectionHTML(section) {
    var list = state.resume[section.key] || [];
    var cards = list.map(function (item, i) {
      var fields = section.fields.map(function (f) {
        return fieldHTML(section.key + "." + i + "." + f.k, f, item[f.k]);
      });
      var title = "";
      var titleKeys = { education: "school", internships: "company", projects: "name", campus: "org", awards: "name", skills: "category" };
      var tk = titleKeys[section.key];
      if (tk && hasText(item[tk])) title = " — " + item[tk];
      return '<div class="entry-card">' +
        '<div class="entry-card-head"><span class="idx">' + section.title + " 第" + (i + 1) + "条" + esc(title) + '</span>' +
        '<button class="entry-remove" data-remove="' + section.key + '" data-index="' + i + '">✕ 删除</button></div>' +
        '<div class="form-grid">' + fields.join("") + "</div></div>";
    });
    return '<div class="form-section" data-section="' + section.key + '">' +
      '<div class="form-section-head"><h2>' + esc(section.title) + "</h2>" +
      '<span class="tip">' + esc(section.tip || "") + "</span>" +
      '<span class="chevron">▼</span></div>' +
      '<div class="form-section-body">' + cards.join("") +
      '<button class="add-btn" data-add="' + section.key + '">+ 添加' + esc(section.title) + "</button></div></div>";
  }

  function singleSectionHTML(section) {
    var v = state.resume[section.key] || "";
    var rows = section.rows || 3;
    return '<div class="form-section" data-section="' + section.key + '">' +
      '<div class="form-section-head"><h2>' + esc(section.title) + "</h2>" +
      '<span class="tip">' + esc(section.tip || "") + "</span>" +
      '<span class="chevron">▼</span></div>' +
      '<div class="form-section-body"><div class="form-grid">' +
      '<div class="form-field full"><textarea data-path="' + section.key + '" rows="' + rows + '" placeholder="' + esc(section.ph || "") + '">' + esc(v) + "</textarea></div>" +
      "</div></div></div>";
  }

  /* 板块管理卡片（顺序调整 + 显示/隐藏 + 恢复默认） */
  function managerHTML() {
    var rows = sectionOrder().map(function (key, i) {
      var def = SECTION_DEFS[key];
      if (!def) return "";
      var hidden = isSectionHidden(key);
      return '<div class="sec-mgr-row' + (hidden ? " hidden" : "") + '">' +
        '<span class="sec-mgr-idx">' + (i + 1) + "</span>" +
        '<span class="sec-mgr-name">' + esc(def.title) + "</span>" +
        (hidden ? '<span class="sec-mgr-badge">已隐藏</span>' : "") +
        '<span class="sec-mgr-actions">' +
        '<button type="button" class="btn small ghost" data-sec-up="' + key + '" title="上移">↑</button>' +
        '<button type="button" class="btn small ghost" data-sec-down="' + key + '" title="下移">↓</button>' +
        '<button type="button" class="btn small ghost" data-sec-toggle="' + key + '" title="' + (hidden ? "点击显示该板块" : "点击隐藏该板块（数据保留）") + '">' + (hidden ? "👁 显示" : "🙈 隐藏") + "</button>" +
        "</span></div>";
    }).join("");
    return '<div class="form-section sec-manager"><div class="form-section-head"><h2>板块管理</h2>' +
      '<span class="tip">调整顺序与显示（如求职意向可隐藏）</span><span class="chevron">▼</span></div>' +
      '<div class="form-section-body"><div class="sec-mgr-list">' + rows + "</div>" +
      '<button type="button" class="btn small ghost" data-sec-reset="1" style="margin-top:8px">↺ 恢复模板默认顺序与显示</button>' +
      '<div class="hint" style="font-size:11px;color:var(--text-2);margin-top:6px">隐藏板块仅不在简历中显示，数据不会丢失；基本信息固定置顶。</div>' +
      "</div></div>";
  }

  function renderSection(def) {
    if (def.kind === "object") return objectSectionHTML(def);
    if (def.kind === "single") return singleSectionHTML(def);
    return listSectionHTML(def);
  }

  function objectSectionHTML(def) {
    return '<div class="form-section" data-section="' + def.key + '"><div class="form-section-head"><h2>' + esc(def.title) + "</h2>" +
      '<span class="tip">' + esc(def.tip || "") + '</span><span class="chevron">▼</span></div>' +
      '<div class="form-section-body"><div class="form-grid">' +
      def.fields.map(function (f) { return fieldHTML(def.key + "." + f.k, f, state.resume[def.key][f.k]); }).join("") +
      "</div></div></div>";
  }

  function renderForm() {
    var pane = $("#formPane");
    var tpl = T[state.templateId] || T.tech;
    var tplSelect = '<div class="form-section"><div class="form-section-head"><h2>岗位模板</h2>' +
      '<span class="tip">决定板块默认顺序与体检关键词</span><span class="chevron">▼</span></div>' +
      '<div class="form-section-body"><div class="form-grid">' +
      '<div class="form-field full"><select id="formTemplateSelect">' +
      Object.keys(T).map(function (k) {
        return '<option value="' + k + '"' + (state.templateId === k ? " selected" : "") + ">" + esc(T[k].name + " · " + T[k].desc) + "</option>";
      }).join("") +
      "</select>" +
      '<span class="hint">' + esc("当前模板「" + tpl.name + "」：切换模板不会覆盖你自定义的板块顺序与显示设置。") + "</span>" +
      "</div></div></div></div>";

    var basic = '<div class="form-section" data-section="basic"><div class="form-section-head"><h2>基本信息</h2>' +
      '<span class="tip">*为必填，固定置顶</span><span class="chevron">▼</span></div><div class="form-section-body">' +
      '<div class="form-grid">' +
      BASIC_FIELDS.map(function (f) { return fieldHTML("basic." + f.k, f, state.resume.basic[f.k]); }).join("") +
      '</div><div class="photo-wrap" style="margin-top:10px">' +
      (hasText(state.resume.basic.photo)
        ? '<img id="photoPreview" src="' + esc(state.resume.basic.photo) + '" alt="照片">'
        : '<img id="photoPreview" src="" alt="" style="display:none">') +
      '<div><button id="btnPhoto" class="btn small">📷 上传照片</button> ' +
      '<button id="btnPhotoRemove" class="btn small ghost">移除</button>' +
      '<div class="hint" style="font-size:11px;color:var(--text-2)">选填；自动压缩，仅存本地</div>' +
      '<input id="photoInput" type="file" accept="image/*" style="display:none"></div></div></div></div>';

    var parts = [tplSelect, basic, managerHTML()];
    sectionOrder().forEach(function (key) {
      if (isSectionHidden(key)) return;
      var def = SECTION_DEFS[key];
      if (!def) return;
      parts.push(renderSection(def));
    });
    pane.innerHTML = parts.join("");
  }

  /* 按 data-path 写入状态 */
  function setByPath(path, value) {
    var seg = path.split(".");
    var obj = state.resume;
    for (var i = 0; i < seg.length - 1; i++) obj = obj[seg[i]];
    obj[seg[seg.length - 1]] = value;
  }

  function moveSection(key, dir) {
    var order = sectionOrder().slice();
    var i = order.indexOf(key);
    var j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    order.splice(i, 1);
    order.splice(j, 0, key);
    state.sections.order = order;
    renderForm(); schedulePreview(); saveState(true);
  }

  function toggleSection(key) {
    var hidden = (state.sections.hidden = state.sections.hidden || {});
    var def = SECTION_DEFS[key];
    if (hidden[key]) {
      delete hidden[key];
      toast("已显示「" + def.title + "」", "ok");
    } else {
      hidden[key] = true;
      toast("已隐藏「" + def.title + "」（数据保留，可在板块管理中恢复）", "ok");
    }
    renderForm(); schedulePreview(); saveState(true);
  }

  function resetSections() {
    var tpl = T[state.templateId] || T.tech;
    state.sections = { order: templateOrder(tpl), hidden: {} };
    renderForm(); schedulePreview(); saveState(true);
    toast("已恢复「" + tpl.name + "」模板的默认板块顺序与显示", "ok");
  }

  /* ---------- 预览渲染 ---------- */

  function renderResumeHTML() {
    var r = state.resume;
    var tpl = T[state.templateId] || T.tech;
    var order = sectionOrder();
    var hidden = (state.sections && state.sections.hidden) || {};
    var map = {
      target: secTarget, education: secEducation,
      internships: secInternship, projects: secProject, campus: secCampus,
      research: secResearch,
      awards: secAward, skills: secSkill, evaluation: secEvaluation, extra: secExtra
    };
    var body = order.map(function (k) {
      if (hidden[k] || !map[k]) return "";
      return map[k](r, tpl);
    }).filter(Boolean).join("");
    var photo = hasText(r.basic.photo) ? '<img class="p-photo" src="' + esc(r.basic.photo) + '" alt="">' : "";
    return '<div class="page ' + esc(state.style) + '">' +
      '<header class="p-header"><div><div class="p-name">' + esc(r.basic.name || "（姓名）") + "</div>" +
      '<div class="p-contact">' + contactParts(r).map(esc).join('<span>·</span>') + "</div></div>" + photo + "</header>" +
      body + "</div>";
  }

  function contactParts(r) {
    var parts = [];
    if (hasText(r.basic.phone)) parts.push(r.basic.phone);
    if (hasText(r.basic.email)) parts.push(r.basic.email);
    if (hasText(r.basic.city)) parts.push(r.basic.city);
    if (hasText(r.basic.birth)) parts.push(r.basic.birth);
    if (hasText(r.basic.gender)) parts.push(r.basic.gender);
    if (hasText(r.basic.website)) parts.push(r.basic.website);
    if (hasText(r.basic.github)) parts.push(r.basic.github);
    return parts;
  }

  function secBasic(r) {
    /* 头部（姓名/联系方式/照片）已由页面骨架渲染，这里不再输出板块 */
    return "";
  }

  function secTarget(r, tpl) {
    var t = r.target;
    if (!hasText(t.position) && !hasText(t.city) && !hasText(t.salary) && !hasText(t.availability)) return "";
    var bits = [];
    if (hasText(t.position)) bits.push('<b>' + esc(t.position) + "</b>");
    if (hasText(t.industry)) bits.push("行业：" + esc(t.industry));
    if (hasText(t.city)) bits.push(esc(t.city));
    if (hasText(t.salary)) bits.push(esc(t.salary));
    if (hasText(t.availability)) bits.push("到岗：" + esc(t.availability));
    return '<div class="p-target">' + bits.join(" ｜ ") + "</div>";
  }

  function secEducation(r) {
    var list = r.education || [];
    if (!list.length) return "";
    var items = list.map(function (e) {
      var head = [esc(e.school), esc(e.major), esc(e.degree)].filter(Boolean).join(" · ");
      var range = [j(e.start), j(e.end)].filter(Boolean).join(" - ");
      var meta = [];
      if (hasText(e.gpa)) meta.push("GPA " + esc(e.gpa));
      if (hasText(e.rank)) meta.push("排名 " + esc(e.rank));
      var lines = [];
      if (meta.length) lines.push('<div class="p-edu-line">' + meta.join(" ｜ ") + "</div>");
      if (hasText(e.courses)) lines.push('<div class="p-edu-line">主修课程：' + esc(e.courses) + "</div>");
      if (hasText(e.honors)) lines.push('<div class="p-edu-line">在校荣誉：' + esc(e.honors) + "</div>");
      return '<div class="p-item"><div class="p-edu-row"><span class="p-edu-main">' + head + "</span>" +
        '<span class="p-edu-meta">' + (range ? range : "") + "</span></div>" + lines.join("") + "</div>";
    });
    return secWrap("教育背景", "EDUCATION", items.join(""));
  }

  function bulletsHTML(content) {
    var lines = String(content || "").split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    if (!lines.length) return "";
    return '<ul class="p-bullets">' + lines.map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("") + "</ul>";
  }

  function secInternship(r) {
    var list = r.internships || [];
    if (!list.length) return "";
    var items = list.map(function (it) {
      var range = [j(it.start), j(it.end)].filter(Boolean).join(" - ");
      return '<div class="p-item"><div class="p-item-head">' +
        '<span class="p-item-title">' + esc(it.company || "（公司）") + (hasText(it.title) ? " · " + esc(it.title) : "") + "</span>" +
        '<span class="p-item-range">' + esc(range) + "</span></div>" + bulletsHTML(it.content) + "</div>";
    });
    return secWrap("实习经历", "INTERNSHIP", items.join(""));
  }

  function secProject(r) {
    var list = r.projects || [];
    if (!list.length) return "";
    var items = list.map(function (it) {
      var range = [j(it.start), j(it.end)].filter(Boolean).join(" - ");
      var sub = [];
      if (hasText(it.role)) sub.push(it.role);
      if (hasText(it.tech)) sub.push(it.tech);
      return '<div class="p-item"><div class="p-item-head">' +
        '<span class="p-item-title">' + esc(it.name || "（项目）") + "</span>" +
        '<span class="p-item-range">' + esc(range) + "</span></div>" +
        (sub.length ? '<div class="p-item-sub">' + esc(sub.join(" ｜ ")) + "</div>" : "") +
        bulletsHTML(it.content) + "</div>";
    });
    return secWrap("项目经历", "PROJECT", items.join(""));
  }

  function secCampus(r) {
    var list = r.campus || [];
    if (!list.length) return "";
    var items = list.map(function (it) {
      var range = [j(it.start), j(it.end)].filter(Boolean).join(" - ");
      return '<div class="p-item"><div class="p-item-head">' +
        '<span class="p-item-title">' + esc(it.org || "（组织）") + (hasText(it.role) ? " · " + esc(it.role) : "") + "</span>" +
        '<span class="p-item-range">' + esc(range) + "</span></div>" + bulletsHTML(it.content) + "</div>";
    });
    return secWrap("校园经历", "CAMPUS", items.join(""));
  }

  function secResearch(r) {
    var list = r.research || [];
    if (!list.length) return "";
    var items = list.map(function (it) {
      var head = [];
      if (hasText(it.kind)) head.push(esc(it.kind));
      head.push(esc(it.title || "（名称）"));
      var meta = [];
      if (hasText(it.role)) meta.push(esc(it.role));
      if (hasText(it.venue)) meta.push(esc(it.venue));
      if (hasText(it.date)) meta.push(esc(it.date));
      var note = hasText(it.note) ? bulletsHTML(it.note) : "";
      return '<div class="p-item"><div class="p-item-head"><span class="p-item-title">' + head.join(" · ") + "</span></div>" +
        (meta.length ? '<div class="p-item-sub">' + meta.join(" ｜ ") + "</div>" : "") +
        note + "</div>";
    });
    return secWrap("科研成果", "RESEARCH", items.join(""));
  }

  function secAward(r) {
    var list = r.awards || [];
    if (!list.length) return "";
    var items = list.map(function (a) {
      return '<div class="p-award-line"><span>' + esc(a.name || "（奖项）") + "</span>" +
        (hasText(a.level) ? '<span class="lvl">' + esc(a.level) + "</span>" : "") +
        (hasText(a.date) ? '<span class="date">' + esc(a.date) + "</span>" : "") + "</div>";
    });
    return secWrap("荣誉奖项", "HONORS", items.join(""));
  }

  function secSkill(r) {
    var list = r.skills || [];
    var rows = list.filter(function (s) { return hasText(s.items); }).map(function (s) {
      return '<div class="p-skill-line"><span class="p-skill-cat">' + esc(s.category || "技能") + "</span><span>" + esc(s.items) + "</span></div>";
    });
    if (!rows.length) return "";
    return secWrap("技能", "SKILLS", rows.join(""));
  }

  function secEvaluation(r) {
    if (!hasText(r.evaluation)) return "";
    return secWrap("自我评价", "SELF-EVALUATION", '<div class="p-eval">' + esc(r.evaluation) + "</div>");
  }

  function secExtra(r) {
    if (!hasText(r.extra)) return "";
    return secWrap("其他", "OTHERS", '<div class="p-eval">' + esc(r.extra) + "</div>");
  }

  function secWrap(title, en, inner) {
    return '<section class="p-sec"><h3 class="p-sec-h">' + esc(title) + ' <span class="en">' + esc(en) + "</span></h3>" + inner + "</section>";
  }

  /* 缩放适配容器 */
  function fitScale(container) {
    var wrap = $(".scale-wrap", container);
    if (!wrap) return;
    var page = $(".page", container);
    if (!page) return;
    var avail = container.clientWidth - 32;
    var scale = Math.min(1, Math.max(0.1, avail / 794));
    wrap.style.transform = "scale(" + scale + ")";
    wrap.style.width = "794px";
    wrap.style.height = (page.offsetHeight * scale) + "px";
  }

  function schedulePreview() {
    if (window.__previewTimer) clearTimeout(window.__previewTimer);
    window.__previewTimer = setTimeout(function () { renderAllPreviews(); }, 120);
  }

  function renderAllPreviews() {
    var html = renderResumeHTML();
    var mini = $("#miniPreviewBody");
    var big = $("#previewBody");
    var printArea = $("#printArea");
    if (mini) { mini.innerHTML = html; fitScale(mini); }
    if (big) { big.innerHTML = html; fitScale(big); }
    if (printArea) printArea.innerHTML = html;
  }

  /* ---------- 体检 ---------- */

  var lastReport = null;

  function runAudit() {
    var result = Engine.audit(state.resume, state.templateId, { hidden: state.sections && state.sections.hidden });
    lastReport = result;
    var levelCls = result.total >= 85 ? "good" : result.total >= 70 ? "mid" : "bad";
    var c = 2 * Math.PI * 40;
    var off = c * (1 - result.total / 100);

    var cats = result.categories.map(function (cat) {
      var pct = cat.max ? Math.round(cat.score / cat.max * 100) : 0;
      var barCls = pct >= 80 ? "ok" : pct >= 50 ? "mid" : "bad";
      return '<div class="cat-card"><div class="cat-name"><span>' + esc(cat.name) + '</span><span>' + cat.score + "/" + cat.max + "</span></div>" +
        '<div class="cat-bar"><i class="' + barCls + '" style="width:' + pct + '%"></i></div>' +
        '<div class="cat-tip">' + esc(cat.tip) + "</div></div>";
    }).join("");

    var sevOrder = { error: 0, warn: 1, info: 2 };
    var sevName = { error: "严重问题", warn: "建议改进", info: "提示" };
    var groups = ["error", "warn", "info"].map(function (sev) {
      var items = result.items.filter(function (it) { return it.severity === sev; });
      if (!items.length) return "";
      return '<h4 style="margin:14px 0 8px">' + sevName[sev] + "（" + items.length + "）</h4>" +
        '<ul class="issue-list">' + items.map(function (it) {
          return '<li class="issue ' + sev + '"><div class="issue-title"><span class="sev-tag ' + sev + '">' + sevName[sev] + "</span>" +
            '<span>' + esc(it.title) + "</span><span class=\"issue-section\">" + esc(it.section) + "</span></div>" +
            (hasText(it.detail) ? '<div class="issue-detail">' + esc(it.detail) + "</div>" : "") + "</li>";
        }).join("") + "</ul>";
    }).join("");

    $("#auditSummary").textContent = result.summary;
    $("#auditBody").innerHTML =
      '<div class="score-card">' +
      '<div class="score-ring"><svg width="96" height="96"><circle cx="48" cy="48" r="40" fill="none" stroke="var(--border)" stroke-width="8"></circle>' +
      '<circle cx="48" cy="48" r="40" fill="none" stroke-width="8" stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + off + '" style="stroke:' + (result.total >= 85 ? "var(--ok)" : result.total >= 70 ? "var(--warn)" : "var(--danger)") + '"></circle></svg>' +
      '<div class="num">' + result.total + '<small> /100</small></div></div>' +
      '<div class="score-meta"><div class="score-level ' + levelCls + '">' + esc(result.passLevel) + "</div>" +
      '<div style="font-size:12.5px;color:var(--text-2)">' + esc(result.summary) + "</div>" +
      '<div class="cat-grid">' + cats + "</div></div></div>" + groups;
  }

  function copyReport() {
    if (!lastReport) { toast("请先点击「开始体检」", "err"); return; }
    var lines = ["简历体检报告（总分 " + lastReport.total + "/100 · " + lastReport.passLevel + "）", ""];
    lastReport.categories.forEach(function (cat) {
      lines.push("【" + cat.name + "】" + cat.score + "/" + cat.max);
    });
    lines.push("");
    lastReport.items.forEach(function (it) {
      lines.push("[" + it.severity + "] " + it.title + (hasText(it.detail) ? "：" + it.detail : ""));
    });
    var text = lines.join("\n");
    copyText(text).then(function () { toast("体检报告已复制", "ok"); }, function () { toast("复制失败，请手动选择", "err"); });
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        resolve();
      } catch (e) { reject(e); }
    });
  }

  /* ---------- 求职台 ---------- */

  var APP_STATUSES = ["待投递", "已投递", "笔试", "面试中", "Offer", "已拒绝", "放弃"];

  function renderTimeline() {
    var el = $("#timeline");
    if (!el) return;
    el.innerHTML = (window.RESUME_TIMELINE || []).map(function (item) {
      return '<div class="tl-item"><div class="tl-dot"></div><div class="tl-body">' +
        '<div class="tl-head"><span class="tl-stage">' + esc(item.stage) + '</span><span class="tl-time">' + esc(item.time) + "</span></div>" +
        '<div class="tl-note">' + esc(item.note) + "</div></div></div>";
    }).join("");
  }

  function renderTracker() {
    var wrap = $("#appTableWrap");
    if (!wrap) return;
    var list = state.tracker || [];
    if (!list.length) {
      wrap.innerHTML = '<div style="color:var(--text-2);font-size:13px;padding:14px 4px">还没有投递记录。点击「+ 添加」开始记录每一份投递，秋招/春招都能用。</div>';
      return;
    }
    var stats = {};
    list.forEach(function (a) { stats[a.status] = (stats[a.status] || 0) + 1; });
    var rows = list.map(function (a, i) {
      var opts = APP_STATUSES.map(function (s) {
        return '<option value="' + s + '"' + (a.status === s ? " selected" : "") + ">" + s + "</option>";
      }).join("");
      return '<tr>' +
        '<td style="white-space:nowrap;color:var(--text-2)">' + (i + 1) + "</td>" +
        '<td><input data-app="' + a.id + '" data-k="company" value="' + esc(a.company) + '" placeholder="公司"></td>' +
        '<td><input data-app="' + a.id + '" data-k="position" value="' + esc(a.position) + '" placeholder="岗位"></td>' +
        '<td><input data-app="' + a.id + '" data-k="channel" value="' + esc(a.channel) + '" placeholder="渠道"></td>' +
        '<td><input data-app="' + a.id + '" data-k="date" value="' + esc(a.date) + '" placeholder="2025-09-01"></td>' +
        '<td><select data-app="' + a.id + '" data-k="status">' + opts + "</select></td>" +
        '<td style="white-space:nowrap">' +
        (a.status === "Offer" ? '<span class="status-pill st-Offer">Offer</span> ' : "") +
        '<button class="btn small ghost" data-appdel="' + a.id + '">✕</button></td>' +
        "</tr>";
    }).join("");
    wrap.innerHTML =
      '<div style="font-size:12.5px;color:var(--text-2);margin-bottom:8px">共 ' + list.length + " 条 ｜ " +
      APP_STATUSES.filter(function (s) { return stats[s]; }).map(function (s) {
        return '<span class="status-pill st-' + s + '">' + s + " " + stats[s] + "</span>";
      }).join(" ") + "</div>" +
      '<table class="app-table"><thead><tr><th>#</th><th>公司</th><th>岗位</th><th>渠道</th><th>投递日期</th><th>状态</th><th></th></tr></thead><tbody>' + rows + "</tbody></table>";
  }

  function addApp() {
    (state.tracker = state.tracker || []).push({ id: uid(), company: "", position: "", channel: "", date: "", status: "待投递" });
    renderTracker(); saveState(true);
  }

  function exportAppsCSV() {
    var list = state.tracker || [];
    var head = ["公司", "岗位", "渠道", "投递日期", "状态"];
    var lines = [head.join(",")];
    list.forEach(function (a) {
      lines.push([a.company, a.position, a.channel, a.date, a.status].map(function (v) {
        return '"' + String(v || "").replace(/"/g, '""') + '"';
      }).join(","));
    });
    Ex.download("投递记录-" + timeHM().replace(":", "") + ".csv", "\uFEFF" + lines.join("\n"), "text/csv");
    toast("CSV 已导出", "ok");
  }

  function renderChecklist() {
    var el = $("#checklist");
    if (!el) return;
    var groups = state.checklist || [];
    var total = 0, done = 0;
    groups.forEach(function (g) {
      (g.items || []).forEach(function (it) { total++; if (it.done) done++; });
    });
    $("#checkProgress").textContent = done + "/" + total;
    var html = groups.map(function (g, gi) {
      return '<div class="cl-group"><div class="cl-group-title">' + esc(g.group) + "</div>" +
        (g.items || []).map(function (it, ii) {
          return '<label class="cl-item' + (it.done ? " done" : "") + '">' +
            '<input type="checkbox" data-check="' + gi + "." + ii + '"' + (it.done ? " checked" : "") + ">" +
            "<span>" + esc(it.text) + "</span></label>";
        }).join("") + "</div>";
    }).join("") +
      '<button id="btnAddCheck" class="btn small ghost" style="margin-top:6px">+ 添加自定义项</button>';
    el.innerHTML = html;
  }

  function addCheckItem() {
    var text = prompt("自定义准备项：", "");
    if (!text || !text.trim()) return;
    var groups = state.checklist || [];
    var last = groups[groups.length - 1];
    if (!last) { last = { group: "自定义", items: [] }; groups.push(last); }
    last.items.push({ text: text.trim(), done: false });
    renderChecklist(); saveState(true);
  }

  /* ---------- AI ---------- */

  function renderAIBody() {
    var cfg = AI.loadConfig();
    var body = $("#aiBody");
    var entries = collectEntries();
    var entryOpts = entries.length
      ? entries.map(function (e) { return '<option value="' + e.key + ":" + e.index + '">' + esc(e.label) + "</option>"; }).join("")
      : '<option value="">（先添加实习/项目/校园经历）</option>';
    body.innerHTML =
      '<div class="ai-card"><h3>🔑 AI 配置（可选）</h3>' +
      '<div class="ai-config">' +
      '<div class="row"><label style="font-size:12px;color:var(--text-2);flex:none">DeepSeek API Key</label>' +
      '<input id="aiKey" type="password" placeholder="sk-..." value="' + esc(cfg ? cfg.key : "") + '">' +
      '<button id="btnSaveAI" class="btn small">保存</button></div>' +
      '<div class="row"><label style="font-size:12px;color:var(--text-2)">模型</label>' +
      '<select id="aiModel" style="font-family:inherit;font-size:13px;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:6px 10px">' +
      '<option value="deepseek-chat"' + (!cfg || cfg.model === "deepseek-chat" ? " selected" : "") + ">deepseek-chat（推荐）</option>" +
      '<option value="deepseek-reasoner"' + (cfg && cfg.model === "deepseek-reasoner" ? " selected" : "") + ">deepseek-reasoner（深度思考）</option></select>" +
      '<button id="btnClearAI" class="btn small ghost">清除 Key</button></div>' +
      '<div class="ai-note">Key 仅保存在本机浏览器（localStorage），请求直连 DeepSeek 官方 API，不经任何中转。不使用 AI 也完全不影响其他功能。</div>' +
      "</div></div>" +
      '<div class="ai-card"><h3>✨ 优化任务</h3>' +
      '<div class="ai-actions">' +
      '<button id="btnAISuggest" class="btn">整体优化建议</button>' +
      '<button id="btnAIRewrite" class="btn">按岗位定向改写</button>' +
      '<select id="aiEntrySelect" class="ai-polish-select">' + entryOpts + "</select>" +
      '<button id="btnAIPolish" class="btn"' + (entries.length ? "" : " disabled") + ">润色选中经历</button>" +
      "</div>" +
      '<div id="aiResult" class="ai-result">AI 建议将显示在这里。先填好简历，再点上面的按钮；优化建议可参考「简历体检」一起使用。</div>' +
      '<div id="aiToolbar" class="ai-toolbar"></div></div>';
  }

  function collectEntries() {
    var out = [];
    var lists = [["internships", "实习"], ["projects", "项目"], ["campus", "校园"]];
    lists.forEach(function (pair) {
      var key = pair[0], label = pair[1];
      (state.resume[key] || []).forEach(function (it, i) {
        var title = it.company || it.name || it.org || "";
        out.push({ key: key, index: i, label: label + "经历 · " + (title || "第" + (i + 1) + "条"), title: title, content: it.content || "" });
      });
    });
    return out;
  }

  var aiAbort = null;

  function runAITask(kind) {
    var cfg = AI.loadConfig();
    if (!cfg || !cfg.key) { toast("请先在上方配置 API Key", "err"); return; }
    var tpl = T[state.templateId] || T.tech;
    var resultEl = $("#aiResult");
    var toolbar = $("#aiToolbar");
    resultEl.className = "ai-result loading";
    resultEl.textContent = "AI 正在思考，请稍候（约 10-60 秒）…";
    toolbar.innerHTML = "";
    if (aiAbort) aiAbort.abort();
    aiAbort = new AbortController();
    var timer = setTimeout(function () { aiAbort && aiAbort.abort(); }, 120000);

    var task = null;
    var resumeForAI = visibleResume();
    if (kind === "suggest") task = AI.aiSuggest(resumeForAI, tpl, cfg, aiAbort.signal);
    else if (kind === "rewrite") task = AI.aiRewrite(resumeForAI, tpl, cfg, aiAbort.signal);
    else {
      var sel = $("#aiEntrySelect");
      var val = sel && sel.value ? sel.value.split(":") : null;
      if (!val || !val[0]) { toast("请先选择要润色的经历", "err"); return; }
      var entries = collectEntries();
      var entry = entries.filter(function (e) { return e.key === val[0] && String(e.index) === val[1]; })[0];
      if (!entry) { toast("未找到该经历", "err"); return; }
      var ctxText = tpl.name + (tpl.desc ? " · " + tpl.desc : "");
      task = AI.aiPolish(entry.label, entry.content, ctxText, cfg, aiAbort.signal);
    }

    task.then(function (text) {
      clearTimeout(timer);
      aiAbort = null;
      resultEl.className = "ai-result";
      resultEl.textContent = text;
      renderAIToolbar(kind, text);
    }).catch(function (err) {
      clearTimeout(timer);
      aiAbort = null;
      resultEl.className = "ai-result";
      resultEl.innerHTML = '<span class="err">' + esc(err && err.message ? err.message : String(err)) + "</span>";
    });
  }

  function renderAIToolbar(kind, text) {
    var toolbar = $("#aiToolbar");
    if (!toolbar) return;
    var btns = [];
    btns.push('<button id="aiCopy" class="btn small">复制结果</button>');
    if (kind === "polish") {
      btns.push('<button id="aiApply" class="btn small primary">替换原经历内容</button>');
    }
    toolbar.innerHTML = btns.join("");
    $("#aiCopy").onclick = function () {
      copyText(text).then(function () { toast("已复制", "ok"); }, function () { toast("复制失败", "err"); });
    };
    if (kind === "polish") {
      $("#aiApply").onclick = function () {
        var cleaned = AI.cleanOutput(text);
        var lines = cleaned.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
        if (!lines.length) { toast("AI 返回内容无法识别为要点列表，请改用「复制结果」手动粘贴", "err"); return; }
        var sel = $("#aiEntrySelect");
        var val = sel && sel.value ? sel.value.split(":") : null;
        if (!val || !val[0]) return;
        var entry = collectEntries().filter(function (e) { return e.key === val[0] && String(e.index) === val[1]; })[0];
        if (!entry) return;
        confirmModal("确认替换", "将用 AI 改写后的内容替换「" + entry.label + "」的原文。建议先对比再应用。", function () {
          state.resume[entry.key][entry.index].content = lines.join("\n");
          renderForm(); renderTracker(); schedulePreview(); saveState(true);
          toast("已替换，可在「简历编辑」中继续微调", "ok");
        });
      };
    }
  }

  /* ---------- 弹窗 / Toast ---------- */

  function openModal(title, bodyHTML, footHTML) {
    var root = $("#modalRoot");
    var mask = document.createElement("div");
    mask.className = "modal-mask";
    mask.innerHTML = '<div class="modal"><div class="modal-head"><span>' + esc(title) + '</span>' +
      '<button class="modal-close">✕</button></div><div class="modal-body">' + bodyHTML + "</div>" +
      (footHTML ? '<div class="modal-foot">' + footHTML + "</div>" : "") + "</div>";
    root.appendChild(mask);
    function close() { mask.remove(); }
    $(".modal-close", mask).onclick = close;
    mask.addEventListener("mousedown", function (e) { if (e.target === mask) close(); });
    return { el: mask, close: close };
  }

  function confirmModal(title, message, onOk) {
    var m = openModal(title, "<p style='margin:0'>" + esc(message) + "</p>",
      '<button class="btn cancel-ok">取消</button><button class="btn primary ok-go">确定</button>');
    $(".cancel-ok", m.el).onclick = m.close;
    $(".ok-go", m.el).onclick = function () { m.close(); onOk(); };
  }

  function toast(text, kind) {
    var root = $("#toastRoot");
    var el = document.createElement("div");
    el.className = "toast" + (kind === "ok" ? " ok" : kind === "err" ? " err" : "");
    el.textContent = text;
    root.appendChild(el);
    setTimeout(function () { el.remove(); }, 3200);
  }

  /* ---------- 导入 / 备份 ---------- */

  function adoptResume(data, msg) {
    var resume = data && data.resume ? data.resume : data;
    if (!resume || !resume.basic) throw new Error("文件格式不正确");
    state.resume = Object.assign(emptyResume(), resume);
    if (data && Array.isArray(data.tracker)) state.tracker = data.tracker;
    if (data && Array.isArray(data.checklist)) state.checklist = data.checklist;
    renderForm(); renderTracker(); renderChecklist(); schedulePreview(); saveState(true);
    toast(msg || "已导入", "ok");
  }

  function openBackupModal() {
    var m = openModal("备份与导出",
      '<p style="margin:0 0 6px;color:var(--text-2);font-size:12.5px">选择一种导出方式：</p>' +
      '<div style="display:flex;flex-direction:column;gap:8px">' +
      '<button class="btn bk-html">📄 单文件 HTML 备份（含当前数据，可双击打开继续编辑）</button>' +
      '<button class="btn bk-json">💾 纯 JSON 数据（用于导入/迁移）</button>' +
      '<button class="btn bk-md">📝 Markdown 简历（方便粘贴到在线工具/投递系统）</button>' +
      "</div>");
    $(".bk-html", m.el).onclick = function () {
      if (!window.__RESUME_KIT_SINGLE_FILE__) { toast("当前环境缺少单文件模板，请使用「导出 JSON」", "err"); return; }
      var html = Ex.buildPortableHTML(window.__RESUME_KIT_SINGLE_FILE__, state.resume);
      var d = new Date();
      Ex.download("简历工作台-备份-" + d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + ".html", html, "text/html");
      toast("单文件备份已下载", "ok");
      m.close();
    };
    $(".bk-json", m.el).onclick = function () {
      Ex.download("简历数据.json", Ex.toJSON({ resume: state.resume, tracker: state.tracker, checklist: state.checklist }), "application/json");
      toast("JSON 已导出", "ok");
      m.close();
    };
    $(".bk-md", m.el).onclick = function () {
      Ex.download("简历-" + (state.resume.basic.name || "未命名") + ".md", Ex.toMarkdown(state.resume, state.templateId), "text/markdown");
      toast("Markdown 已导出", "ok");
      m.close();
    };
  }

  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  /* ---------- 照片 ---------- */

  function handlePhoto(file) {
    if (!file || !file.type || file.type.indexOf("image/") !== 0) { toast("请选择图片文件", "err"); return; }
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var MAX = 360;
        var scale = Math.min(1, MAX / Math.max(img.width, img.height));
        var canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        var dataURL = canvas.toDataURL("image/jpeg", 0.85);
        state.resume.basic.photo = dataURL;
        renderForm(); schedulePreview(); saveState(true);
        toast("照片已更新", "ok");
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  /* ---------- 示例填充 ---------- */

  function fillSample() {
    var tpl = T[state.templateId] || T.tech;
    var hasData = state.resume.education.length || state.resume.internships.length || state.resume.projects.length;
    var doFill = function () {
      state.resume.education = [{
        id: uid(), school: "XX大学（示例，请替换）", major: "计算机科学与技术", degree: "本科",
        start: "2021-09", end: "2025-06", gpa: "3.7/4.0", rank: "前 10%",
        courses: "数据结构、操作系统、计算机网络、数据库原理", honors: "校级一等奖学金、优秀学生"
      }];
      if (tpl.sampleInternship) {
        state.resume.internships = [Object.assign({ id: uid() }, tpl.sampleInternship)];
      }
      if (tpl.sampleProject) {
        state.resume.projects = [Object.assign({ id: uid() }, tpl.sampleProject)];
      }
      renderForm(); schedulePreview(); saveState(true);
      toast("已填入「" + tpl.name + "」岗位示例，请逐条替换为真实内容", "ok");
    };
    if (hasData) confirmModal("覆盖现有内容？", "当前已有教育/实习/项目内容，填入示例将覆盖它们。", doFill);
    else doFill();
  }

  /* ---------- 主题 ---------- */

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme || "light");
    state.theme = theme || "light";
  }
  function toggleTheme() {
    var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    storeSet(THEME_KEY, next);
  }

  /* ---------- 事件绑定 ---------- */

  function bindEvents() {
    /* 选项卡 */
    $("#tabs").addEventListener("click", function (e) {
      var btn = e.target.closest(".tab");
      if (!btn) return;
      $$(".tab").forEach(function (t) { t.classList.toggle("active", t === btn); });
      $$(".tab-panel").forEach(function (p) { p.classList.toggle("active", p.id === "tab-" + btn.dataset.tab); });
      if (btn.dataset.tab === "preview") setTimeout(function () { renderAllPreviews(); fitScale($("#previewBody")); }, 30);
    });

    /* 表单：事件委托 */
    $("#formPane").addEventListener("input", function (e) {
      var el = e.target;
      var path = el.dataset && el.dataset.path;
      if (path) {
        setByPath(path, el.value);
        schedulePreview();
        scheduleSave();
      }
    });
    $("#formPane").addEventListener("change", function (e) {
      var el = e.target;
      if (el.id === "formTemplateSelect") {
        state.templateId = el.value;
        renderForm();
        schedulePreview(); saveState(true);
        toast("已切换岗位模板：" + (T[state.templateId] || {}).name, "ok");
      }
      var path = el.dataset && el.dataset.path;
      if (path) {
        setByPath(path, el.value);
        schedulePreview(); scheduleSave();
      }
    });
    $("#formPane").addEventListener("click", function (e) {
      var head = e.target.closest(".form-section-head");
      if (head) {
        var sec = head.parentElement;
        sec.classList.toggle("collapsed");
        return;
      }
      var add = e.target.closest("[data-add]");
      if (add) {
        var key = add.dataset.add;
        var def = SECTION_DEFS[key];
        var item = {};
        def.fields.forEach(function (f) { item[f.k] = ""; });
        item.id = uid();
        state.resume[key].push(item);
        renderForm(); schedulePreview(); saveState(true);
        var card = $('.form-section[data-section="' + key + '"] .entry-card:last-child');
        if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      var rm = e.target.closest("[data-remove]");
      if (rm) {
        state.resume[rm.dataset.remove].splice(Number(rm.dataset.index), 1);
        renderForm(); schedulePreview(); saveState(true);
        return;
      }
      /* 结束时间：至今 切换 */
      var nowOn = e.target.closest("[data-now-on]");
      if (nowOn) {
        setByPath(nowOn.dataset.nowOn, "至今");
        renderForm(); schedulePreview(); saveState(true);
        return;
      }
      var nowOff = e.target.closest("[data-now-off]");
      if (nowOff) {
        setByPath(nowOff.dataset.nowOff, "");
        renderForm(); schedulePreview(); saveState(true);
        return;
      }
      if (e.target.id === "btnPhoto") { $("#photoInput").click(); }
      if (e.target.id === "btnPhotoRemove") {
        state.resume.basic.photo = "";
        renderForm(); schedulePreview(); saveState(true);
      }
      /* 板块管理：上移 / 下移 / 显示隐藏 / 恢复默认 */
      var secUp = e.target.closest("[data-sec-up]");
      if (secUp) { moveSection(secUp.dataset.secUp, -1); return; }
      var secDown = e.target.closest("[data-sec-down]");
      if (secDown) { moveSection(secDown.dataset.secDown, 1); return; }
      var secToggle = e.target.closest("[data-sec-toggle]");
      if (secToggle) { toggleSection(secToggle.dataset.secToggle); return; }
      var secReset = e.target.closest("[data-sec-reset]");
      if (secReset) { resetSections(); return; }
    });
    $("#photoInput").addEventListener("change", function () {
      if (this.files && this.files[0]) handlePhoto(this.files[0]);
      this.value = "";
    });

    /* 顶栏 */
    $("#btnTheme").onclick = toggleTheme;
    $("#btnPrint").onclick = function () { window.print(); };
    $("#btnPrint2").onclick = function () { window.print(); };
    $("#btnBackup").onclick = openBackupModal;
    $("#btnImport").onclick = function () {
      var input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json,.json";
      input.onchange = function () {
        var f = input.files && input.files[0];
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function () {
          try {
            var data = JSON.parse(reader.result);
            if (!data || !data.resume) throw new Error("文件格式不正确");
            confirmModal("导入简历数据", "将用文件内容替换当前简历（含投递记录与清单）。当前数据请先备份。", function () {
              adoptResume(data, "导入成功");
            });
          } catch (err) {
            toast("导入失败：" + (err && err.message ? err.message : "文件格式错误"), "err");
          }
        };
        reader.readAsText(f);
      };
      input.click();
    };

    /* 预览页 */
    $("#templateSelect").addEventListener("change", function () {
      state.templateId = this.value;
      renderForm(); renderAllPreviews(); saveState(true);
    });
    $("#styleSelect").addEventListener("change", function () {
      state.style = this.value;
      renderAllPreviews(); saveState(true);
    });
    $("#btnFillSample").onclick = fillSample;
    $("#btnGoPreview").onclick = function () {
      $$(".tab").forEach(function (t) { t.classList.toggle("active", t.dataset.tab === "preview"); });
      $$(".tab-panel").forEach(function (p) { p.classList.toggle("active", p.id === "tab-preview"); });
      setTimeout(function () { renderAllPreviews(); fitScale($("#previewBody")); }, 30);
    };

    /* 体检 */
    $("#btnAudit").onclick = runAudit;
    $("#btnCopyReport").onclick = copyReport;

    /* 求职台 */
    $("#btnAddApp").onclick = addApp;
    $("#btnExportApps").onclick = exportAppsCSV;
    $("#appTableWrap").addEventListener("input", function (e) {
      var el = e.target;
      if (!el.dataset.app) return;
      var app = state.tracker.filter(function (a) { return a.id === el.dataset.app; })[0];
      if (app) { app[el.dataset.k] = el.value; scheduleSave(); }
    });
    $("#appTableWrap").addEventListener("change", function (e) {
      var el = e.target;
      if (!el.dataset.app) return;
      var app = state.tracker.filter(function (a) { return a.id === el.dataset.app; })[0];
      if (app) { app[el.dataset.k] = el.value; renderTracker(); scheduleSave(); }
    });
    $("#appTableWrap").addEventListener("click", function (e) {
      var del = e.target.closest("[data-appdel]");
      if (del) {
        state.tracker = state.tracker.filter(function (a) { return a.id !== del.dataset.appdel; });
        renderTracker(); saveState(true);
      }
    });
    $("#checklist").addEventListener("change", function (e) {
      var el = e.target;
      if (!el.dataset.check) return;
      var seg = el.dataset.check.split(".").map(Number);
      state.checklist[seg[0]].items[seg[1]].done = el.checked;
      renderChecklist(); saveState(true);
    });
    $("#checklist").addEventListener("click", function (e) {
      if (e.target.id === "btnAddCheck") addCheckItem();
    });

    /* AI */
    $("#aiBody").addEventListener("click", function (e) {
      if (e.target.id === "btnSaveAI") {
        var key = $("#aiKey").value.trim();
        if (!key) { toast("请输入 API Key", "err"); return; }
        var cfg = AI.loadConfig() || {};
        cfg.key = key;
        cfg.model = $("#aiModel").value;
        AI.saveConfig(cfg);
        toast("API Key 已保存到本机", "ok");
      }
      if (e.target.id === "btnClearAI") {
        AI.saveConfig(null);
        $("#aiKey").value = "";
        toast("已清除 API Key", "ok");
      }
      if (e.target.id === "btnAISuggest") runAITask("suggest");
      if (e.target.id === "btnAIRewrite") runAITask("rewrite");
      if (e.target.id === "btnAIPolish") runAITask("polish");
    });
  }

  /* ---------- 初始化 ---------- */

  function init() {
    ensureResumeShape();
    normalizeSections();
    var savedTheme = storeGet(THEME_KEY);
    applyTheme(savedTheme || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

    var tplSel = $("#templateSelect");
    tplSel.innerHTML = Object.keys(T).map(function (k) {
      return '<option value="' + k + '"' + (state.templateId === k ? " selected" : "") + ">" + esc(T[k].name + " · " + T[k].desc) + "</option>";
    }).join("");
    var stySel = $("#styleSelect");
    var STYLES = [["blue", "简约蓝"], ["business", "商务灰"], ["fresh", "清新绿"], ["modern", "现代紫"]];
    stySel.innerHTML = STYLES.map(function (s) {
      return '<option value="' + s[0] + '"' + (state.style === s[0] ? " selected" : "") + ">" + s[1] + "</option>";
    }).join("");

    renderForm();
    renderTimeline();
    renderTracker();
    renderChecklist();
    renderAIBody();
    renderAllPreviews();
    bindEvents();

    var boot = window.__RESUME_KIT_BOOT_DATA__;
    if (boot && boot.resume) {
      toast("已加载便携版内嵌数据，编辑后将自动保存", "ok");
    } else {
      setTimeout(function () { showSaveStatus("已就绪 · 自动保存开启"); }, 600);
    }

    /* 容器尺寸变化时重新缩放预览 */
    ["miniPreviewBody", "previewBody"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && window.ResizeObserver) {
        new ResizeObserver(function () { fitScale(el); }).observe(el);
      }
    });
    window.addEventListener("resize", function () {
      renderAllPreviews();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
