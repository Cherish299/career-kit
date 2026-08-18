/* app.js — AI 岗刷题主逻辑（题库 / 笔试模拟 / 面试模拟 / 学习统计） */
(function () {
  "use strict";

  var Q = window.INTERVIEW_QUESTIONS || [];
  var STORE_KEY = "interviewKit:state:v1";
  var THEME_KEY = "interviewKit:theme";

  /* ---------- 小工具 ---------- */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function hasText(v) { return typeof v === "string" && v.trim().length > 0; }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  var memStore = {};
  var storageOK = true;
  try {
    window.localStorage.setItem("__interview_kit_probe__", "1");
    window.localStorage.removeItem("__interview_kit_probe__");
  } catch (e) { storageOK = false; }
  function storeGet(key) {
    if (storageOK) { try { return window.localStorage.getItem(key); } catch (e) { /* fallthrough */ } }
    return memStore[key] || null;
  }
  function storeSet(key, val) {
    memStore[key] = val;
    if (storageOK) { try { window.localStorage.setItem(key, val); } catch (e) { /* ignore */ } }
  }

  /* ---------- 元数据 ---------- */

  var CATS = [
    { key: "ml", name: "机器学习基础", icon: "📊" },
    { key: "dl", name: "深度学习", icon: "🧠" },
    { key: "llm", name: "Transformer 与大模型", icon: "🤖" },
    { key: "rag", name: "RAG 与文档抽取", icon: "📑" },
    { key: "agent", name: "Agent 与工具调用", icon: "🔧" },
    { key: "kg", name: "知识图谱与图数据", icon: "🕸️" },
    { key: "train", name: "训练与微调", icon: "🛠️" },
    { key: "infer", name: "推理与部署", icon: "⚡" },
    { key: "math", name: "数学与统计", icon: "∑" },
    { key: "code", name: "算法与手撕代码", icon: "⌨️" },
    { key: "scene", name: "场景与系统设计", icon: "🏗️" },
    { key: "behavior", name: "项目与行为面试", icon: "🗣️" }
  ];
  var CAT_MAP = {};
  CATS.forEach(function (c) { CAT_MAP[c.key] = c; });

  var TYPE_META = {
    choice: { name: "选择题", cls: "t-choice" },
    judge: { name: "判断题", cls: "t-judge" },
    short: { name: "简答题", cls: "t-short" },
    code: { name: "手撕代码", cls: "t-code" },
    scene: { name: "场景设计", cls: "t-scene" },
    behavior: { name: "行为面试", cls: "t-behavior" }
  };
  var DIFF_META = { 1: { name: "基础", stars: "★" }, 2: { name: "进阶", stars: "★★" }, 3: { name: "困难", stars: "★★★" } };

  function catOf(q) { return CAT_MAP[q.cat] || { name: q.cat, icon: "❓" }; }

  /* ---------- 状态 ---------- */

  function defaultState() {
    return { records: {}, quizHistory: [], updatedAt: 0 };
  }

  function loadState() {
    try {
      var raw = storeGet(STORE_KEY);
      if (raw) {
        var d = JSON.parse(raw);
        if (d && d.records) return Object.assign(defaultState(), d);
      }
    } catch (e) { /* ignore */ }
    return defaultState();
  }

  var state = loadState();
  var saveTimer = null;

  function saveState(force) {
    if (saveTimer && !force) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = null;
    state.updatedAt = Date.now();
    try {
      storeSet(STORE_KEY, JSON.stringify(state));
      showSaveStatus("已保存 " + timeHM());
    } catch (e) { showSaveStatus("保存失败"); }
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
    if (el) el.textContent = text;
  }

  function recOf(qid) {
    return state.records[qid] = state.records[qid] || { state: "", fav: false, wrong: false, quizCorrect: 0, quizTotal: 0, attempts: 0, last: 0 };
  }
  function updateRecord(qid, patch) {
    var rec = recOf(qid);
    Object.keys(patch).forEach(function (k) { rec[k] = patch[k]; });
    rec.last = Date.now();
    rec.attempts += 1;
    scheduleSave();
  }
  function isWrong(qid) {
    var r = state.records[qid];
    return !!(r && (r.wrong || r.state === "unknown"));
  }

  /* ---------- 渲染辅助 ---------- */

  function renderSolution(text) {
    var parts = String(text || "").split("```");
    var html = '<div class="sol-head">📝 答案与解析</div>';
    parts.forEach(function (part, i) {
      if (i % 2 === 1) {
        var code = part.replace(/^[a-zA-Z]+\n/, "");
        html += '<pre class="sol-code">' + esc(code) + "</pre>";
      } else if (part.trim()) {
        html += '<div class="sol-text">' + esc(part).replace(/\n/g, "<br>") + "</div>";
      }
    });
    return html;
  }

  function qCardHTML(q, opts) {
    opts = opts || {};
    var rec = state.records[q.id] || {};
    var typeMeta = TYPE_META[q.type] || { name: q.type, cls: "t-short" };
    var diffMeta = DIFF_META[q.diff] || DIFF_META[1];
    var stateBadge = "";
    if (isWrong(q.id)) stateBadge = '<span class="q-state unknown">待复习</span>';
    else if (rec.state === "vague") stateBadge = '<span class="q-state vague">模糊</span>';
    else if (rec.state === "know") stateBadge = '<span class="q-state know">已掌握</span>';

    var optionsHTML = "";
    if (q.type === "choice" && q.options) {
      optionsHTML = '<div class="q-options">' + q.options.map(function (o) {
        var isAnswer = opts.showAnswer && o.charAt(0) === (q.answer || "");
        var cls = isAnswer ? " correct" : "";
        return '<div class="q-option' + cls + '">' + esc(o) + (isAnswer ? ' <span style="color:var(--ok);font-weight:700">✓</span>' : "") + "</div>";
      }).join("") + "</div>";
    } else if (q.type === "judge" && opts.showAnswer) {
      optionsHTML = '<div class="q-options"><div class="q-option' + (q.answer === "对" ? " correct" : "") + '">对</div><div class="q-option' + (q.answer === "错" ? " correct" : "") + '">错</div></div>';
    }

    var foot = '<div class="q-foot">' +
      '<button type="button" class="btn small ghost" data-q-sol="' + q.id + '">' + (opts.expanded ? "收起解析 ▲" : "查看解析 ▼") + "</button>" +
      (opts.showAnswer ? '<span class="q-state know">标准答案：' + esc(q.answer || "—") + "</span>" : "") +
      (opts.selfRate !== false ? '<span class="self-rate">' +
        '<button type="button" class="rate-btn' + (rec.state === "know" && !rec.wrong ? " active-know" : "") + '" data-rate="' + q.id + ':know">😊 会了</button>' +
        '<button type="button" class="rate-btn' + (rec.state === "vague" ? " active-vague" : "") + '" data-rate="' + q.id + ':vague">🤔 模糊</button>' +
        '<button type="button" class="rate-btn' + (isWrong(q.id) ? " active-unknown" : "") + '" data-rate="' + q.id + ':unknown">😵 不会</button>' +
        "</span>" : "") +
      '<button type="button" class="btn small ghost" data-fav="' + q.id + '" title="收藏">' + (rec.fav ? "⭐" : "☆") + "</button>" +
      "</div>";

    return '<div class="q-card" id="q-' + q.id + '">' +
      '<div class="q-head">' +
      '<span class="type-badge ' + typeMeta.cls + '">' + typeMeta.name + "</span>" +
      '<span class="diff-stars" title="' + diffMeta.name + '">' + diffMeta.stars + '</span><span class="diff-label">' + diffMeta.name + "</span>" +
      stateBadge +
      '<span class="q-tags">' + (q.tags || []).map(function (t) { return '<span class="q-tag">' + esc(t) + "</span>"; }).join("") + "</span>" +
      "</div>" +
      '<div class="q-text"><span class="q-id">' + esc(q.id) + "</span>" + esc(q.q) + "</div>" +
      optionsHTML +
      foot +
      (opts.expanded ? '<div class="q-solution">' + renderSolution(q.solution) + "</div>" : "") +
      "</div>";
  }

  /* ---------- 题库 ---------- */

  var bankFilter = { cat: "", type: "", diff: "", search: "", onlyFav: false, onlyWrong: false };

  function filterQuestions() {
    var kw = bankFilter.search.trim().toLowerCase();
    return Q.filter(function (q) {
      if (bankFilter.cat && q.cat !== bankFilter.cat) return false;
      if (bankFilter.type && q.type !== bankFilter.type) return false;
      if (bankFilter.diff && String(q.diff) !== bankFilter.diff) return false;
      if (bankFilter.onlyFav && !(state.records[q.id] && state.records[q.id].fav)) return false;
      if (bankFilter.onlyWrong && !isWrong(q.id)) return false;
      if (kw) {
        var hay = (q.q + " " + q.solution + " " + (q.tags || []).join(" ") + " " + q.id).toLowerCase();
        if (hay.indexOf(kw) < 0) return false;
      }
      return true;
    });
  }

  function renderBankSide() {
    var el = $("#bankSide");
    var total = Q.length;
    var rows = ['<div class="cat-item' + (!bankFilter.cat ? " active" : "") + '" data-cat=""><span>🗂 全部</span><span class="cnt">' + total + "</span></div>"];
    CATS.forEach(function (c) {
      var n = Q.filter(function (q) { return q.cat === c.key; }).length;
      rows.push('<div class="cat-item' + (bankFilter.cat === c.key ? " active" : "") + '" data-cat="' + c.key + '"><span>' + c.icon + " " + esc(c.name) + '</span><span class="cnt">' + n + "</span></div>");
    });
    el.innerHTML = rows.join("");
  }

  function renderBank() {
    var list = filterQuestions();
    $("#bankCount").textContent = "共 " + list.length + " 题";
    var expanded = {};
    $("#bankList").innerHTML = list.length
      ? list.map(function (q) { return qCardHTML(q, { expanded: false, selfRate: true }); }).join("")
      : '<div style="color:var(--text-2);padding:40px;text-align:center">没有符合条件的题目，换个筛选条件试试。</div>';
  }

  /* ---------- 笔试模拟 ---------- */

  var written = null; /* { items, answers, idx, seconds, timerId, cat, count } */

  function renderWrittenSetup() {
    var catOpts = ['<option value="">全部方向</option>'].concat(CATS.map(function (c) {
      return '<option value="' + c.key + '">' + esc(c.name) + "</option>";
    })).join("");
    var writtenBody = $("#writtenBody");
    writtenBody.innerHTML =
      '<div class="setup-card"><h3>✍️ 笔试模拟（选择题 / 判断题，自动判分）</h3>' +
      '<div class="setup-row"><label>方向范围</label><select id="wCat">' + catOpts + "</select></div>" +
      '<div class="setup-row"><label>题目数量</label><select id="wCount">' +
      ["10", "15", "20", "30"].map(function (n) { return '<option value="' + n + '"' + (n === "15" ? " selected" : "") + ">" + n + " 题</option>"; }).join("") +
      "</select></div>" +
      '<div class="setup-row"><label>限时</label><select id="wTime">' +
      '<option value="0">不限时</option><option value="5">5 分钟</option><option value="10" selected>10 分钟</option><option value="15">15 分钟</option><option value="20">20 分钟</option>' +
      "</select></div>" +
      '<div class="setup-hint">题目从「选择题 + 判断题」中随机抽取（按你选的方向），交卷后自动判分并记录错题。</div>' +
      '<div style="margin-top:14px"><button id="btnStartWritten" class="btn primary big">🚀 开始笔试</button></div></div>';
  }

  function startWritten() {
    var cat = $("#wCat").value;
    var count = parseInt($("#wCount").value, 10) || 15;
    var minutes = parseInt($("#wTime").value, 10) || 0;
    var pool = Q.filter(function (q) { return (q.type === "choice" || q.type === "judge") && (!cat || q.cat === cat); });
    if (pool.length < count) count = pool.length;
    if (!count) { toast("该方向暂无可自动判分的题目", "err"); return; }
    /* 洗牌取前 count */
    var items = pool.slice();
    for (var i = items.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = items[i]; items[i] = items[j]; items[j] = t;
    }
    items = items.slice(0, count);
    written = { items: items, answers: {}, idx: 0, seconds: minutes * 60, timerId: null, cat: cat, count: count };
    renderWrittenQuestion();
    if (minutes > 0) {
      written.timerId = setInterval(function () {
        written.seconds -= 1;
        var el = $("#wTimer");
        if (el) {
          el.textContent = fmtTime(written.seconds);
          el.classList.toggle("danger", written.seconds <= 60);
        }
        if (written.seconds <= 0) submitWritten(true);
      }, 1000);
    }
  }

  function fmtTime(s) {
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }

  function renderWrittenQuestion() {
    var q = written.items[written.idx];
    var qn = written.idx + 1;
    var qTotal = written.items.length;
    var answeredCount = written.items.filter(function (it) { return written.answers[it.id] !== undefined; }).length;

    var optionsHTML = "";
    if (q.type === "choice") {
      optionsHTML = q.options.map(function (o) {
        var key = o.charAt(0);
        return '<label class="answer-option' + (written.answers[q.id] === key ? " selected" : "") + '">' +
          '<input type="radio" name="w-answer" value="' + key + '"' + (written.answers[q.id] === key ? " checked" : "") + ">" +
          esc(o) + "</label>";
      }).join("");
    } else {
      optionsHTML = ["对", "错"].map(function (v) {
        return '<label class="answer-option' + (written.answers[q.id] === v ? " selected" : "") + '">' +
          '<input type="radio" name="w-answer" value="' + v + '"' + (written.answers[q.id] === v ? " checked" : "") + ">" +
          v + "</label>";
      }).join("");
    }

    var dots = written.items.map(function (it, i) {
      var cls = "quiz-dot";
      if (written.answers[it.id] !== undefined) cls += " answered";
      if (i === written.idx) cls += " current";
      return '<span class="' + cls + '" data-wgoto="' + i + '">' + (i + 1) + "</span>";
    }).join("");

    $("#writtenBody").innerHTML =
      '<div class="quiz-head">' +
      '<span class="quiz-progress">第 ' + qn + " / " + qTotal + " 题</span>" +
      '<span class="quiz-timer" id="wTimer">' + (written.seconds > 0 ? fmtTime(written.seconds) : "不限时") + "</span>" +
      '<span class="spacer"></span>' +
      '<span style="font-size:12px;color:var(--text-2)">已答 ' + answeredCount + " / " + qTotal + "</span>" +
      '<button type="button" class="btn primary" id="btnWSubmit">交卷</button>' +
      "</div>" +
      '<div class="q-card">' +
      '<div class="q-head"><span class="type-badge ' + (TYPE_META[q.type] || {}).cls + '">' + (TYPE_META[q.type] || {}).name + "</span>" +
      '<span class="diff-stars">' + (DIFF_META[q.diff] || {}).stars + "</span>" +
      '<span class="q-tags">' + (q.tags || []).map(function (t) { return '<span class="q-tag">' + esc(t) + "</span>"; }).join("") + "</span></div>" +
      '<div class="q-text">' + esc(q.q) + "</div>" +
      '<div style="margin-top:12px">' + optionsHTML + "</div>" +
      "</div>" +
      '<div class="quiz-nav">' +
      '<button type="button" class="btn" id="btnWPrev"' + (written.idx === 0 ? " disabled" : "") + ">← 上一题</button>" +
      '<button type="button" class="btn" id="btnWNext"' + (written.idx === qTotal - 1 ? " disabled" : "") + ">下一题 →</button>" +
      '<span class="spacer"></span>' +
      '<button type="button" class="btn ghost" id="btnWQuit">退出</button>' +
      "</div>" +
      '<div class="quiz-dots">' + dots + "</div>";

    $("#btnWPrev").onclick = function () { written.idx = Math.max(0, written.idx - 1); renderWrittenQuestion(); };
    $("#btnWNext").onclick = function () { written.idx = Math.min(written.items.length - 1, written.idx + 1); renderWrittenQuestion(); };
    $("#btnWQuit").onclick = function () { stopWrittenTimer(); written = null; renderWrittenSetup(); };
    $("#btnWSubmit").onclick = function () { submitWritten(false); };

    $$('input[name="w-answer"]').forEach(function (input) {
      input.onchange = function () {
        written.answers[q.id] = input.value;
        renderWrittenQuestion();
        if (written.idx < written.items.length - 1) {
          setTimeout(function () { written.idx += 1; renderWrittenQuestion(); }, 220);
        }
      };
    });
    $$(".quiz-dot").forEach(function (dot) {
      dot.onclick = function () {
        written.idx = parseInt(dot.dataset.wgoto, 10);
        renderWrittenQuestion();
      };
    });
  }

  function stopWrittenTimer() {
    if (written && written.timerId) { clearInterval(written.timerId); written.timerId = null; }
  }

  function submitWritten(auto) {
    if (!written) return;
    if (!auto) {
      var unanswered = written.items.filter(function (it) { return written.answers[it.id] === undefined; }).length;
      if (unanswered > 0) {
        confirmModal("还有 " + unanswered + " 题未作答", "确定现在交卷吗？未作答的题按错误计。", doSubmit);
        return;
      }
    }
    doSubmit();

    function doSubmit() {
      stopWrittenTimer();
      var correct = 0;
      var details = written.items.map(function (it) {
        var user = written.answers[it.id];
        var ok = user !== undefined && user === it.answer;
        if (ok) correct++;
        var rec = state.records[it.id] ? state.records[it.id] : recOf(it.id);
        rec.quizTotal = (rec.quizTotal || 0) + 1;
        rec.quizCorrect = (rec.quizCorrect || 0) + (ok ? 1 : 0);
        if (!ok) rec.wrong = true; else rec.wrong = false;
        rec.last = Date.now();
        return { q: it, user: user, ok: ok };
      });
      state.quizHistory = (state.quizHistory || []).concat([{ kind: "written", date: Date.now(), correct: correct, total: written.items.length, cat: written.cat || "all" }]).slice(-50);
      saveState(true);

      var pct = Math.round(correct / written.items.length * 100);
      var level = pct >= 85 ? "优秀" : pct >= 60 ? "良好" : pct >= 40 ? "待加强" : "需要复习";
      var levelCls = pct >= 85 ? "good" : pct >= 60 ? "good" : pct >= 40 ? "mid" : "bad";

      var review = details.map(function (d) {
        var q = d.q;
        var tag = d.ok ? '<span class="tag-correct">✓ 答对</span>' : '<span class="tag-wrong">✗ 答错（标准答案：' + esc(q.answer) + "）</span>";
        return '<div class="review-item"><div class="q-card">' +
          '<div class="q-text"><span class="q-id">' + esc(q.id) + "</span>" + esc(q.q) + "</div>" +
          '<div class="review-answer">你的答案：' + esc(d.user === undefined ? "（未作答）" : d.user) + "　" + tag + "</div>" +
          '<div class="q-solution">' + renderSolution(q.solution) + "</div></div></div>";
      }).join("");

      var total = written.count;
      $("#writtenBody").innerHTML =
        '<div class="result-card"><div><div class="result-num">' + pct + '<span style="font-size:18px">分</span></div>' +
        '<div class="result-level ' + levelCls + '">' + level + "</div></div>" +
        '<div class="result-meta">答对 ' + correct + " / " + total + " 题（" + (auto ? "时间到自动交卷" : "手动交卷") + "）<br>" +
        "错题已自动加入「错题本」，可在统计页复习。</div>" +
        '<span class="spacer"></span>' +
        '<button type="button" class="btn" id="btnWAgain">再来一组</button>' +
        '<button type="button" class="btn primary" id="btnWBack">返回设置</button></div>' +
        '<div class="section-title">📋 逐题解析</div>' + review;

      $("#btnWAgain").onclick = function () { written = null; startWritten(); };
      $("#btnWBack").onclick = function () { written = null; renderWrittenSetup(); };
    }
  }

  /* ---------- 面试模拟 ---------- */

  var interview = null; /* { items, idx, revealed, cat, count, rates } */

  function renderInterviewSetup() {
    var catOpts = ['<option value="">全部方向</option>'].concat(CATS.map(function (c) {
      return '<option value="' + c.key + '">' + esc(c.name) + "</option>";
    })).join("");
    var body = $("#interviewBody");
    body.innerHTML =
      '<div class="setup-card"><h3>🎤 面试模拟（简答 / 手撕 / 场景 / 行为）</h3>' +
      '<div class="setup-row"><label>方向范围</label><select id="iCat">' + catOpts + "</select></div>" +
      '<div class="setup-row"><label>题目数量</label><select id="iCount">' +
      ["5", "8", "10", "15"].map(function (n) { return '<option value="' + n + '"' + (n === "8" ? " selected" : "") + ">" + n + " 题</option>"; }).join("") +
      "</select></div>" +
      '<div class="setup-row"><label>难度</label><select id="iDiff">' +
      '<option value="">全部难度</option><option value="1">基础 ★</option><option value="2">进阶 ★★</option><option value="3">困难 ★★★</option>' +
      "</select></div>" +
      '<div class="setup-hint">模拟真实面试：先看题思考作答，再查看参考答案并自评（😊 会了 / 🤔 模糊 / 😵 不会）。不会的题目自动进入错题本。</div>' +
      '<div style="margin-top:14px"><button id="btnStartInterview" class="btn primary big">🎤 开始模拟面试</button></div></div>';
  }

  function startInterview() {
    var cat = $("#iCat").value;
    var count = parseInt($("#iCount").value, 10) || 8;
    var diff = $("#iDiff").value;
    var pool = Q.filter(function (q) {
      return q.type !== "choice" && q.type !== "judge" && (!cat || q.cat === cat) && (!diff || String(q.diff) === diff);
    });
    if (pool.length < count) count = pool.length;
    if (!count) { toast("该条件下没有题目", "err"); return; }
    var items = pool.slice();
    for (var i = items.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = items[i]; items[i] = items[j]; items[j] = t;
    }
    items = items.slice(0, count);
    interview = { items: items, idx: 0, revealed: false, cat: cat, count: count, rates: {} };
    renderInterviewQuestion();
  }

  function renderInterviewQuestion() {
    var q = interview.items[interview.idx];
    var qn = interview.idx + 1;
    var qTotal = interview.items.length;
    var rec = state.records[q.id] || {};
    var pct = Math.round((qn - 1) / qTotal * 100);

    $("#interviewBody").innerHTML =
      '<div class="quiz-head">' +
      '<span class="quiz-progress">第 ' + qn + " / " + qTotal + " 题</span>" +
      '<span class="spacer"></span>' +
      '<button type="button" class="btn ghost" id="btnIQuit">结束</button>' +
      "</div>" +
      '<div class="iv-progress-bar"><i style="width:' + pct + '%"></i></div>' +
      '<div class="q-card">' +
      '<div class="q-head">' +
      '<span class="type-badge ' + (TYPE_META[q.type] || {}).cls + '">' + (TYPE_META[q.type] || {}).name + "</span>" +
      '<span class="diff-stars">' + (DIFF_META[q.diff] || {}).stars + "</span>" +
      '<span class="q-tags">' + (q.tags || []).map(function (t) { return '<span class="q-tag">' + esc(t) + "</span>"; }).join("") + "</span>" +
      "</div>" +
      '<div class="q-text"><span class="q-id">' + esc(q.id) + "</span>" + esc(q.q) + "</div>" +
      (interview.revealed ? '<div class="q-solution">' + renderSolution(q.solution) + "</div>" : "") +
      "</div>" +
      '<div class="quiz-nav">' +
      (interview.revealed
        ? '<button type="button" class="btn" id="btnIPrev"' + (interview.idx === 0 ? " disabled" : "") + ">← 上一题</button>" +
          '<button type="button" class="btn primary" id="btnINext">' + (interview.idx === qTotal - 1 ? "完成 ✅" : "下一题 →") + "</button>"
        : '<button type="button" class="btn primary big" id="btnIReveal" style="flex:1">🙈 先思考，再看参考答案</button>') +
      "</div>" +
      (interview.revealed ? '<div class="q-foot" style="margin-top:12px"><span class="self-rate" style="margin-left:0">' +
        '<button type="button" class="rate-btn" data-irate="' + q.id + ':know">😊 答出了</button>' +
        '<button type="button" class="rate-btn" data-irate="' + q.id + ':vague">🤔 部分答出</button>' +
        '<button type="button" class="rate-btn" data-irate="' + q.id + ':unknown">😵 没答出</button>' +
        "</span></div>" : "");

    var el;
    if ((el = $("#btnIReveal"))) el.onclick = function () { interview.revealed = true; renderInterviewQuestion(); };
    if ((el = $("#btnIQuit"))) el.onclick = function () {
      confirmModal("结束模拟面试", "已完成的题目会保留记录，未完成的不计。", function () {
        interview = null; renderInterviewSetup();
      });
    };
    if ((el = $("#btnIPrev"))) el.onclick = function () { interview.idx = Math.max(0, interview.idx - 1); interview.revealed = true; renderInterviewQuestion(); };
    if ((el = $("#btnINext"))) el.onclick = function () {
      if (interview.idx >= interview.items.length - 1) { finishInterview(); return; }
      interview.idx += 1; interview.revealed = false; renderInterviewQuestion();
    };
    $$("[data-irate]").forEach(function (btn) {
      btn.onclick = function () {
        var parts = btn.dataset.irate.split(":");
        updateRecord(parts[0], { state: parts[1] });
        interview.rates[parts[0]] = parts[1];
        toast(parts[1] === "know" ? "已记录：答出 😊" : parts[1] === "vague" ? "已记录：部分答出 🤔" : "已记录：没答出（已加入错题本）😵", parts[1] === "unknown" ? "err" : "ok");
        if (interview.idx < interview.items.length - 1) {
          setTimeout(function () { interview.idx += 1; interview.revealed = false; renderInterviewQuestion(); }, 350);
        } else {
          finishInterview();
        }
      };
    });
  }

  function finishInterview() {
    var total = interview.items.length;
    var counts = { know: 0, vague: 0, unknown: 0 };
    interview.items.forEach(function (q) {
      var s = interview.rates[q.id] || (state.records[q.id] && state.records[q.id].state) || "";
      if (counts[s] !== undefined) counts[s]++;
    });
    state.quizHistory = (state.quizHistory || []).concat([{ kind: "interview", date: Date.now(), correct: counts.know, total: total, cat: interview.cat || "all" }]).slice(-50);
    saveState(true);

    var review = interview.items.map(function (q) {
      var s = interview.rates[q.id] || "";
      var tag = s === "know" ? '<span class="tag-correct">答出</span>' : s === "vague" ? '<span class="q-state vague">部分</span>' : s === "unknown" ? '<span class="tag-wrong">没答出</span>' : '<span class="q-state vague">未评</span>';
      return '<div class="review-item"><div class="q-card">' +
        '<div class="q-head"><span class="type-badge ' + (TYPE_META[q.type] || {}).cls + '">' + (TYPE_META[q.type] || {}).name + "</span>" + tag + "</div>" +
        '<div class="q-text"><span class="q-id">' + esc(q.id) + "</span>" + esc(q.q) + "</div>" +
        '<div class="q-solution">' + renderSolution(q.solution) + "</div></div></div>";
    }).join("");

    $("#interviewBody").innerHTML =
      '<div class="result-card"><div><div class="result-num" style="font-size:30px">' + counts.know + " / " + total + "</div>" +
      '<div class="result-level ' + (counts.know >= total * 0.7 ? "good" : counts.know >= total * 0.4 ? "mid" : "bad") + '">' +
      (counts.know >= total * 0.7 ? "状态不错，保持！" : counts.know >= total * 0.4 ? "有基础，继续刷" : "别灰心，错题已进错题本") + "</div></div>" +
      '<div class="result-meta">😊 答出 ' + counts.know + "　🤔 部分 " + counts.vague + "　😵 没答出 " + counts.unknown + "</div>" +
      '<span class="spacer"></span>' +
      '<button type="button" class="btn" id="btnIAgain">再来一轮</button>' +
      '<button type="button" class="btn primary" id="btnIBack">返回设置</button></div>' +
      '<div class="section-title">📋 题目回顾</div>' + review;

    $("#btnIAgain").onclick = function () { interview = null; startInterview(); };
    $("#btnIBack").onclick = function () { interview = null; renderInterviewSetup(); };
  }

  /* ---------- 统计 ---------- */

  function renderStats() {
    var practiced = Object.keys(state.records).length;
    var know = 0, vague = 0, unknown = 0, favs = 0;
    Object.keys(state.records).forEach(function (qid) {
      var r = state.records[qid];
      if (r.fav) favs++;
      if (r.wrong || r.state === "unknown") unknown++;
      else if (r.state === "vague") vague++;
      else if (r.state === "know") know++;
    });
    var quizC = 0, quizT = 0;
    Object.keys(state.records).forEach(function (qid) {
      var r = state.records[qid];
      quizC += r.quizCorrect || 0;
      quizT += r.quizTotal || 0;
    });
    var acc = quizT ? Math.round(quizC / quizT * 100) : null;

    var catRows = CATS.map(function (c) {
      var inCat = Q.filter(function (q) { return q.cat === c.key; });
      var practicedInCat = inCat.filter(function (q) { return state.records[q.id]; });
      var pct = Math.round(practicedInCat.length / inCat.length * 100);
      return '<div class="progress-row"><span style="width:130px;flex:none">' + c.icon + " " + esc(c.name) + "</span>" +
        '<span class="bar"><i style="width:' + pct + '%"></i></span>' +
        '<span class="pct">' + practicedInCat.length + "/" + inCat.length + "</span></div>";
    }).join("");

    var wrongList = Q.filter(function (q) { return isWrong(q.id); });
    var favList = Q.filter(function (q) { return state.records[q.id] && state.records[q.id].fav; });

    $("#statsBody").innerHTML =
      '<div class="stats-grid">' +
      '<div class="stat-card"><div class="num">' + practiced + '</div><div class="label">已练题目（去重）</div></div>' +
      '<div class="stat-card"><div class="num" style="color:var(--ok)">' + know + '</div><div class="label">已掌握</div></div>' +
      '<div class="stat-card"><div class="num" style="color:var(--warn)">' + vague + '</div><div class="label">模糊</div></div>' +
      '<div class="stat-card"><div class="num" style="color:var(--danger)">' + unknown + '</div><div class="label">待复习（错题本）</div></div>' +
      '<div class="stat-card"><div class="num">' + (acc === null ? "—" : acc + "%") + '</div><div class="label">笔试正确率（' + quizC + "/" + quizT + "）</div></div>" +
      '<div class="stat-card"><div class="num">' + favs + '</div><div class="label">收藏</div></div>' +
      "</div>" +
      '<div class="setup-card"><h3>📊 分类进度</h3>' + catRows +
      (state.quizHistory && state.quizHistory.length
        ? '<div style="margin-top:12px;font-size:12px;color:var(--text-2)">最近记录：' + state.quizHistory.slice(-3).map(function (h) {
            return (h.kind === "written" ? "笔试" : "面试") + " " + (h.cat === "all" ? "综合" : (CAT_MAP[h.cat] || {}).name) + " " + h.correct + "/" + h.total;
          }).join(" · ") + "</div>" : "") +
      "</div>" +
      '<div class="setup-card"><h3>❌ 错题本（' + wrongList.length + '）</h3>' +
      (wrongList.length
        ? wrongList.map(function (q) { return '<div class="progress-row"><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(q.q) + "</span>" +
            '<button type="button" class="btn small ghost" data-review="' + q.id + '">去复习 →</button></div>'; }).join("")
        : '<div style="color:var(--text-2);font-size:13px">暂无错题，继续加油！</div>') +
      "</div>" +
      '<div class="setup-card"><h3>⭐ 收藏（' + favList.length + '）</h3>' +
      (favList.length
        ? favList.map(function (q) { return '<div class="progress-row"><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(q.q) + "</span>" +
            '<button type="button" class="btn small ghost" data-review="' + q.id + '">查看 →</button></div>'; }).join("")
        : '<div style="color:var(--text-2);font-size:13px">在题库中点 ☆ 收藏重点题目。</div>') +
      "</div>" +
      '<div style="margin-top:6px"><button type="button" class="btn danger" id="btnClearStats">🗑 清空学习进度</button></div>';

    $$("[data-review]").forEach(function (btn) {
      btn.onclick = function () { gotoBank(btn.dataset.review); };
    });
    $("#btnClearStats").onclick = function () {
      confirmModal("清空学习进度", "将删除所有学习记录、错题本与收藏（题库本身不变）。", function () {
        state.records = {};
        state.quizHistory = [];
        saveState(true);
        renderStats();
        renderBank();
        renderBankSide();
        toast("学习进度已清空", "ok");
      });
    };
  }

  function gotoBank(qid) {
    $$(".tab").forEach(function (t) { t.classList.toggle("active", t.dataset.tab === "bank"); });
    $$(".tab-panel").forEach(function (p) { p.classList.toggle("active", p.id === "tab-bank"); });
    bankFilter.cat = ""; bankFilter.type = ""; bankFilter.diff = ""; bankFilter.search = ""; bankFilter.onlyFav = false; bankFilter.onlyWrong = false;
    renderBankSide();
    renderBank();
    setTimeout(function () {
      var el = $("#q-" + qid);
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
  }

  /* ---------- 个性化方案（按简历定制） ---------- */

  var PLAN = {
    position: "AI 应用开发 / Agent 应用 / RAG 后端",
    cities: "深圳/广州/北京 · 20-25k",
    deadline: "2026 秋招正式批 9-10 月（提前批已开放，尽早投递）",
    stages: [
      {
        week: "第 1 周", title: "RAG 与 LLM 应用基础",
        cats: ["rag", "llm"],
        goal: "刷完 RAG 全部题 + LLM 应用题；笔试模拟 ≥ 70 分",
        note: "简历核心方向，面试必问：检索链路、chunking、幻觉缓解、结构化输出、function calling",
        written: { count: 10, minutes: 10 },
        interview: { cat: "rag", count: 8 }
      },
      {
        week: "第 2 周", title: "Agent 与系统设计",
        cats: ["agent", "scene"],
        goal: "Agent 全部题 + 场景设计题过一遍；能画清 EcoMINER 架构图并讲透每阶段",
        note: "多阶段工作流、中间产物、重试降级、审核队列——与你的项目深度契合，重点准备",
        written: { count: 15, minutes: 15 },
        interview: { cat: "agent", count: 8 }
      },
      {
        week: "第 3 周", title: "知识图谱 + 笔试算法",
        cats: ["kg", "code"],
        goal: "KG 全部题 + code 高频题二刷；笔试模拟 2 次 ≥ 75 分",
        note: "Neo4j/Cypher/OBOE 讲清楚；Python 手撕题争取全对（笔试大头）",
        written: { count: 20, minutes: 15 },
        interview: { cat: "kg", count: 5 }
      },
      {
        week: "第 4 周", title: "全真模拟冲刺",
        cats: ["train", "infer", "math", "behavior"],
        goal: "错题本清零；综合模拟 3 次；行为题结合项目打磨 STAR 案例",
        note: "综合笔试 + 面试模拟 + 错题复盘；行为题用 EcoMINER 的难点与解决过程讲 STAR",
        written: { count: 30, minutes: 20 },
        interview: { count: 10 }
      }
    ]
  };

  function switchTab(name) {
    $$(".tab").forEach(function (t) { t.classList.toggle("active", t.dataset.tab === name); });
    $$(".tab-panel").forEach(function (p) { p.classList.toggle("active", p.id === "tab-" + name); });
    if (name === "stats") renderStats();
    if (name === "plan") renderPlan();
  }

  function catOfPlan(cat) {
    for (var i = 0; i < CATS.length; i++) if (CATS[i].key === cat) return CATS[i];
    return { key: cat, name: cat, icon: "📁" };
  }

  function catProgress(cat) {
    var all = Q.filter(function (q) { return q.cat === cat; });
    var done = all.filter(function (q) { return state.records[q.id]; });
    return { done: done.length, total: all.length };
  }

  function renderPlan() {
    var head =
      '<div class="setup-card"><h3>🎯 你的定制方案</h3>' +
      '<div style="font-size:13px;color:var(--text-2);margin-top:2px">目标岗位：<b style="color:var(--text)">' + esc(PLAN.position) + "</b> ｜ " + esc(PLAN.cities) + "</div>" +
      '<div style="font-size:12px;color:var(--warn);margin-top:6px">⏰ ' + esc(PLAN.deadline) + " · 建议每周刷完对应分类 + 完成 1-2 次模拟</div>" +
      '<div style="font-size:12px;color:var(--text-2);margin-top:4px">题库已按你的简历定制：RAG 15 题 · Agent 16 题 · 知识图谱 7 题 · 场景/算法/行为补强（共 210 题）</div></div>';

    var stages = PLAN.stages.map(function (st) {
      var catRows = st.cats.map(function (c) {
        var meta = catOfPlan(c);
        var p = catProgress(c);
        var pct = p.total ? Math.round(p.done / p.total * 100) : 0;
        return '<div class="progress-row"><span style="width:150px;flex:none">' + meta.icon + " " + esc(meta.name) + "</span>" +
          '<span class="bar"><i style="width:' + pct + '%"></i></span>' +
          '<span class="pct">' + p.done + "/" + p.total + "</span></div>";
      }).join("");

      var totalDone = 0, totalAll = 0;
      st.cats.forEach(function (c) { var p = catProgress(c); totalDone += p.done; totalAll += p.total; });
      var stagePct = totalAll ? Math.round(totalDone / totalAll * 100) : 0;

      return '<div class="setup-card"><h3>' + esc(st.week) + " · " + esc(st.title) +
        ' <span class="pct" style="float:right;background:none;padding:0">' + stagePct + "%</span></h3>" +
        '<div style="font-size:12px;color:var(--text-2);margin:-4px 0 8px">' + esc(st.note) + "</div>" +
        catRows +
        '<div style="font-size:12px;color:var(--text-2);margin-top:8px">🎯 ' + esc(st.goal) + "</div>" +
        '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">' +
        '<button type="button" class="btn small" data-plan-go="' + st.cats[0] + '">📚 刷「' + esc(catOfPlan(st.cats[0]).name) + "」</button>" +
        '<button type="button" class="btn small" data-plan-written="' + st.week + '">✍️ 笔试模拟（' + st.written.count + " 题 / " + st.written.minutes + " 分）</button>" +
        '<button type="button" class="btn small ghost" data-plan-interview="' + st.week + '">🎤 面试模拟（' + st.interview.count + " 题）</button>" +
        "</div></div>";
    }).join("");

    $("#planBody").innerHTML = head + stages;
  }

  function planGoBank(cat) {
    bankFilter.cat = cat; bankFilter.type = ""; bankFilter.diff = ""; bankFilter.search = ""; bankFilter.onlyFav = false; bankFilter.onlyWrong = false;
    renderBankSide(); renderBank();
    switchTab("bank");
  }
  function planStartWritten(week) {
    var st = null;
    PLAN.stages.forEach(function (s) { if (s.week === week) st = s; });
    if (!st) return;
    switchTab("written");
    renderWrittenSetup();
    var wCat = $("#wCat"); if (wCat) wCat.value = "";
    var wCount = $("#wCount"); if (wCount) wCount.value = String(st.written.count);
    var wTime = $("#wTime"); if (wTime) wTime.value = String(st.written.minutes);
    startWritten();
  }
  function planStartInterview(week) {
    var st = null;
    PLAN.stages.forEach(function (s) { if (s.week === week) st = s; });
    if (!st) return;
    switchTab("interview");
    renderInterviewSetup();
    var iCat = $("#iCat"); if (iCat && st.interview.cat) iCat.value = st.interview.cat;
    var iCount = $("#iCount"); if (iCount) iCount.value = String(st.interview.count);
    startInterview();
  }

  /* ---------- 主题 / 弹窗 / Toast ---------- */

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme || "light");
  }

  function openModal(title, bodyHTML, footHTML) {
    var mask = document.createElement("div");
    mask.className = "modal-mask";
    mask.innerHTML = '<div class="modal"><div class="modal-head"><span>' + esc(title) + '</span>' +
      '<button class="modal-close">✕</button></div><div class="modal-body">' + bodyHTML + "</div>" +
      (footHTML ? '<div class="modal-foot">' + footHTML + "</div>" : "") + "</div>";
    $("#modalRoot").appendChild(mask);
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
    var el = document.createElement("div");
    el.className = "toast" + (kind === "ok" ? " ok" : kind === "err" ? " err" : "");
    el.textContent = text;
    $("#toastRoot").appendChild(el);
    setTimeout(function () { el.remove(); }, 3200);
  }

  /* ---------- 事件绑定 ---------- */

  function bindEvents() {
    $("#tabs").addEventListener("click", function (e) {
      var btn = e.target.closest(".tab");
      if (!btn) return;
      switchTab(btn.dataset.tab);
    });

    /* 我的方案：快捷入口 */
    $("#planBody").addEventListener("click", function (e) {
      var go = e.target.closest("[data-plan-go]");
      if (go) { planGoBank(go.dataset.planGo); return; }
      var w = e.target.closest("[data-plan-written]");
      if (w) { planStartWritten(w.dataset.planWritten); return; }
      var iv = e.target.closest("[data-plan-interview]");
      if (iv) { planStartInterview(iv.dataset.planInterview); return; }
    });

    $("#btnTheme").onclick = function () {
      var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
      storeSet(THEME_KEY, next);
    };

    /* 题库 */
    $("#bankSide").addEventListener("click", function (e) {
      var item = e.target.closest(".cat-item");
      if (!item) return;
      bankFilter.cat = item.dataset.cat;
      renderBankSide();
      renderBank();
    });
    $("#searchInput").addEventListener("input", function () {
      bankFilter.search = this.value;
      renderBank();
    });
    $("#typeFilter").addEventListener("change", function () {
      bankFilter.type = this.value;
      renderBank();
    });
    $("#diffFilter").addEventListener("change", function () {
      bankFilter.diff = this.value;
      renderBank();
    });
    $("#btnOnlyFav").onclick = function () {
      bankFilter.onlyFav = !bankFilter.onlyFav;
      bankFilter.onlyWrong = false;
      this.classList.toggle("on", bankFilter.onlyFav);
      $("#btnOnlyWrong").classList.remove("on");
      renderBank();
    };
    $("#btnOnlyWrong").onclick = function () {
      bankFilter.onlyWrong = !bankFilter.onlyWrong;
      bankFilter.onlyFav = false;
      this.classList.toggle("on", bankFilter.onlyWrong);
      $("#btnOnlyFav").classList.remove("on");
      renderBank();
    };
    $("#bankList").addEventListener("click", function (e) {
      var sol = e.target.closest("[data-q-sol]");
      if (sol) {
        var card = sol.closest(".q-card");
        var qid = sol.dataset.qSol;
        var q = Q.filter(function (x) { return x.id === qid; })[0];
        if (!q) return;
        var wasExpanded = !!$(".q-solution", card);
        var html = qCardHTML(q, { expanded: !wasExpanded, selfRate: true });
        card.outerHTML = html;
        return;
      }
      var rate = e.target.closest("[data-rate]");
      if (rate) {
        var parts = rate.dataset.rate.split(":");
        updateRecord(parts[0], { state: parts[1] });
        renderBank();
        toast(parts[1] === "know" ? "已标记：会了 😊" : parts[1] === "vague" ? "已标记：模糊 🤔" : "已标记：不会（进入错题本）😵", parts[1] === "unknown" ? "err" : "ok");
        return;
      }
      var fav = e.target.closest("[data-fav]");
      if (fav) {
        var r = recOf(fav.dataset.fav);
        r.fav = !r.fav;
        scheduleSave();
        renderBank();
        toast(r.fav ? "已收藏 ⭐" : "已取消收藏", "ok");
      }
    });

    /* 笔试 / 面试 */
    $("#writtenBody").addEventListener("click", function (e) {
      if (e.target.id === "btnStartWritten") startWritten();
    });
    $("#interviewBody").addEventListener("click", function (e) {
      if (e.target.id === "btnStartInterview") startInterview();
    });

    /* 导入导出 */
    $("#btnExport").onclick = function () {
      var data = JSON.stringify({ app: "interview-kit", version: 1, exportedAt: new Date().toISOString(), records: state.records, quizHistory: state.quizHistory }, null, 2);
      download("AI刷题进度.json", data, "application/json");
      toast("进度已导出", "ok");
    };
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
            if (!data || !data.records) throw new Error("格式不正确");
            confirmModal("导入学习进度", "将合并（覆盖同名题目的记录）导入文件中的进度。", function () {
              Object.keys(data.records).forEach(function (qid) {
                state.records[qid] = Object.assign(recOf(qid), data.records[qid]);
              });
              if (Array.isArray(data.quizHistory)) state.quizHistory = data.quizHistory;
              saveState(true);
              renderStats(); renderBank(); renderBankSide();
              toast("导入成功", "ok");
            });
          } catch (err) {
            toast("导入失败：" + (err && err.message ? err.message : "文件格式错误"), "err");
          }
        };
        reader.readAsText(f);
      };
      input.click();
    };
  }

  function download(filename, content, mime) {
    var a = document.createElement("a");
    a.download = filename;
    try {
      if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function" && typeof Blob !== "undefined") {
        var blob = new Blob([content], { type: (mime || "text/plain") + ";charset=utf-8" });
        var url = URL.createObjectURL(blob);
        a.href = url;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
        return;
      }
    } catch (e) { /* fallthrough */ }
    a.href = "data:" + (mime || "text/plain") + ";charset=utf-8," + encodeURIComponent(content);
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { document.body.removeChild(a); }, 100);
  }

  /* ---------- 初始化 ---------- */

  function init() {
    var savedTheme = storeGet(THEME_KEY);
    applyTheme(savedTheme || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

    var typeSel = $("#typeFilter");
    typeSel.innerHTML = ['<option value="">全部题型</option>'].concat(Object.keys(TYPE_META).map(function (k) {
      return '<option value="' + k + '">' + TYPE_META[k].name + "</option>";
    })).join("");
    var diffSel = $("#diffFilter");
    diffSel.innerHTML = ['<option value="">全部难度</option>', '<option value="1">基础 ★</option>', '<option value="2">进阶 ★★</option>', '<option value="3">困难 ★★★</option>'].join("");

    renderBankSide();
    renderBank();
    renderWrittenSetup();
    renderInterviewSetup();
    renderStats();
    bindEvents();

    setTimeout(function () { showSaveStatus("共 " + Q.length + " 题 · 已就绪"); }, 400);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
