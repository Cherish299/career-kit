"use strict";

function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function getSlug() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts[parts.length - 1] || new URLSearchParams(window.location.search).get("slug") || "";
}

function renderList(id, items, renderItem, emptyText) {
  const node = document.getElementById(id);
  node.innerHTML = items.length ? items.map(renderItem).join("") : `<div class="muted">${esc(emptyText)}</div>`;
}

function renderRoles(roles) {
  const node = document.getElementById("publicRoles");
  if (!roles || !roles.length) {
    node.innerHTML = "";
    return;
  }
  node.innerHTML = roles.map((role) => `<span class="chip">${esc(role)}</span>`).join("");
}

async function copyCurrentLink() {
  const url = window.location.href;
  try {
    await navigator.clipboard.writeText(url);
    const btn = document.getElementById("btnCopyPublicLink");
    const old = btn.textContent;
    btn.textContent = "已复制 ✓";
    setTimeout(() => { btn.textContent = old; }, 1600);
  } catch {
    const btn = document.getElementById("btnCopyPublicLink");
    btn.textContent = "复制失败";
    setTimeout(() => { btn.textContent = "复制当前页链接"; }, 1600);
  }
}

async function loadPublicProfile() {
  const slug = getSlug();
  if (!slug) {
    document.getElementById("publicName").textContent = "缺少公开主页 slug";
    return;
  }

  const res = await fetch(`/api/profiles/public/${encodeURIComponent(slug)}`);
  if (!res.ok) {
    document.getElementById("publicName").textContent = "公开主页不存在";
    document.getElementById("publicSummary").textContent = "请确认 slug 正确，且画像已设置为 public 或 shared。";
    return;
  }

  const data = await res.json();
  document.title = `${data.display_name || slug} · CareerOS Public Profile`;
  document.getElementById("publicName").textContent = data.display_name || slug;
  document.getElementById("publicSummary").textContent = data.summary || "这位候选人暂未填写公开简介。";
  renderRoles(data.roles || []);
  document.getElementById("publicMeta").textContent = `公开项目 ${data.experiences.length} 条 · 公开技能 ${data.skills.length} 项`;

  renderList(
    "publicExperiences",
    data.experiences || [],
    (item) => `<article class="public-item"><h3>${esc(item.title || item.role || item.type)}</h3><div class="muted">${esc(item.organization || item.type || "")}</div><p>${esc(item.content || "")}</p></article>`,
    "暂无公开经历。"
  );
  renderList(
    "publicSkills",
    data.skills || [],
    (item) => `<article class="public-item"><h3>${esc(item.name || "未命名技能")}</h3><div class="muted">${esc(item.level || "")}</div><p>${esc(item.items || "")}</p></article>`,
    "暂无公开技能。"
  );
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnCopyPublicLink").addEventListener("click", copyCurrentLink);
  loadPublicProfile().catch((error) => {
    document.getElementById("publicName").textContent = "加载失败";
    document.getElementById("publicSummary").textContent = error.message;
  });
});
