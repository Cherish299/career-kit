/* ai.js — 可选 DeepSeek AI 优化模块（本地规则之外的增强功能）
 * API Key 仅保存在浏览器 localStorage，不经过任何第三方服务器。
 * 暴露全局 ResumeAI。
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "resumeKit:ai";
  var DEFAULT_BASE = "https://api.deepseek.com";
  var DEFAULT_MODEL = "deepseek-chat";

  /* ---------- 配置存取 ---------- */

  function loadConfig() {
    try {
      var raw = global.localStorage && global.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var c = JSON.parse(raw);
        if (c && c.key) return { key: c.key, base: c.base || DEFAULT_BASE, model: c.model || DEFAULT_MODEL };
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  function saveConfig(cfg) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    } catch (e) { /* ignore */ }
  }

  /* ---------- 调用 DeepSeek ---------- */

  /**
   * @param messages [{role, content}]
   * @param cfg {key, base, model}
   * @returns 模型返回文本
   */
  async function chat(messages, cfg, signal) {
    var base = (cfg && cfg.base) || DEFAULT_BASE;
    var model = (cfg && cfg.model) || DEFAULT_MODEL;
    var key = cfg && cfg.key;
    if (!key) throw new Error("未配置 API Key，请先在「AI 优化」面板中填写。");

    var resp = await fetch(base.replace(/\/+$/, "") + "/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + key
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.6,
        stream: false
      }),
      signal: signal
    });
    if (!resp.ok) {
      var detail = "";
      try { detail = (await resp.json()).error && (await resp.json()).error.message; } catch (e) { /* ignore */ }
      throw new Error("API 请求失败（HTTP " + resp.status + "）" + (detail ? "：" + detail : ""));
    }
    var data = await resp.json();
    var text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!text) throw new Error("API 返回内容为空，请重试。");
    return text.trim();
  }

  /* ---------- 提示词与业务方法 ---------- */

  var SYSTEM_HR = "你是一位深耕校招 10 年的资深 HR 兼简历顾问，熟悉国内互联网大厂、国企、银行的校招简历筛选标准。你的回答：一针见血、可执行、不说空话，全部用中文。";

  function compactResume(resume) {
    // 传给模型的简历压缩文本（去掉 photo 等无关字段）
    var fields = ["basic", "target", "education", "internships", "projects", "campus", "awards", "skills", "evaluation", "extra"];
    var out = {};
    fields.forEach(function (k) { if (resume && resume[k] !== undefined) out[k] = resume[k]; });
    if (out.basic) delete out.basic.photo;
    var s = JSON.stringify(out);
    return s.length > 6000 ? s.slice(0, 6000) + "…（内容过长已截断）" : s;
  }

  /**
   * 整体优化建议：针对简历与目标岗位给出 5-8 条具体改进意见。
   */
  function aiSuggest(resume, template, cfg, signal) {
    var tplName = template && template.name ? template.name : "未指定岗位";
    return chat([
      { role: "system", content: SYSTEM_HR },
      { role: "user", content:
        "以下是某应届生的简历数据（JSON）与目标岗位：\n目标岗位：" + tplName + "\n简历：\n" + compactResume(resume) +
        "\n\n请给出 5-8 条具体的优化建议，覆盖：①结构与板块 ②实习/项目经历的写法 ③量化数据 ④关键词与岗位匹配 ⑤自我评价。每条建议：先说问题，再给改法示例。用编号列表，不要客套话。" }
    ], cfg, signal);
  }

  /**
   * 岗位定向改写：按目标岗位的关键词与写法要求，输出各经历板块的改写示例。
   */
  function aiRewrite(resume, template, cfg, signal) {
    var tplName = template && template.name ? template.name : "未指定岗位";
    var kws = template && template.keywords ? template.keywords.slice(0, 12).join("、") : "（未提供关键词）";
    return chat([
      { role: "system", content: SYSTEM_HR },
      { role: "user", content:
        "以下是某应届生的简历数据（JSON）：\n" + compactResume(resume) +
        "\n\n目标岗位：" + tplName + "，该岗位高频关键词：" + kws +
        "\n\n请针对该岗位逐条改写「实习经历」和「项目经历」的描述要点（保留事实，不要编造经历；可以自然引入真实存在的技能/工具词）。输出格式：每条经历以「【实习1】【实习2】【项目1】…」开头，下面是改写后的要点列表（每条一行，动词开头，尽量带量化）。" }
    ], cfg, signal);
  }

  /**
   * 润色单条经历：返回改写后的要点文本。
   */
  function aiPolish(entryTitle, content, contextText, cfg, signal) {
    return chat([
      { role: "system", content: SYSTEM_HR },
      { role: "user", content:
        "请润色下面的经历描述，使其符合校招简历标准（动词开头、STAR 结构、尽量量化、每条一行）。只能改写表达，不得编造事实与数字；如果原文没有数字，用「XX」占位并注明需要补充。\n经历名称：" + entryTitle +
        (contextText ? "\n相关背景（目标岗位/技术栈）：" + contextText : "") +
        "\n原文：\n" + content +
        "\n\n直接输出改写后的要点列表，每条一行，不要任何解释、不要 markdown 代码块。" }
    ], cfg, signal);
  }

  /* 清理模型输出：去代码块围栏与前后缀 */
  function cleanOutput(text) {
    var t = (text || "").trim();
    t = t.replace(/^```[a-zA-Z]*\s*/m, "").replace(/\s*```\s*$/, "");
    t = t.replace(/^【[^】]*】\s*/gm, "").trim();
    return t;
  }

  global.ResumeAI = {
    loadConfig: loadConfig,
    saveConfig: saveConfig,
    chat: chat,
    aiSuggest: aiSuggest,
    aiRewrite: aiRewrite,
    aiPolish: aiPolish,
    cleanOutput: cleanOutput,
    DEFAULT_BASE: DEFAULT_BASE,
    DEFAULT_MODEL: DEFAULT_MODEL
  };
})(typeof window !== "undefined" ? window : globalThis);
