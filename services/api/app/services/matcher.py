"""规则匹配服务（MVP 确定性版本）：硬条件 + 关键词 → MatchReport。

计划书分层：MVP 先做硬条件层 + 关键词层，输出逐项证据；语义层第 6 周后引入。
任何结果都必须可复现、可解释、不编造。
"""
from __future__ import annotations

from app.models import Job, MatchReport, Preference, Profile

# AI 应用 / RAG / Agent 岗位关键词词典（大小写不敏感子串匹配）
KEYWORD_DICT: list[str] = [
    # 语言与后端
    "python", "java", "c++", "go", "fastapi", "flask", "django", "sql",
    "redis", "docker", "k8s", "kubernetes", "linux", "git", "rest", "api",
    # RAG / 检索
    "rag", "embedding", "vector", "faiss", "chroma", "bm25", "rerank",
    "检索", "召回", "语义", "向量库",
    # LLM / Agent
    "llm", "agent", "大模型", "微调", "prompt", "function calling",
    "工具调用", "多模态", "vlm", "langchain", "transformers", "pytorch",
    # 知识图谱
    "neo4j", "知识图谱", "cypher", "本体", "entity",
    # 数据与工程
    "pandas", "numpy", "streamlit", "pytest", "自动化测试", "分布式",
    "高并发", "pydantic", "schema",
]

# 硬条件权重（0-30）
HARD_MAX = 30
KEYWORD_MAX = 20


def _profile_text(profile: Profile) -> str:
    parts: list[str] = []
    for e in profile.experiences:
        parts.extend([e.title, e.role, e.organization, e.content, _extra_text(e.extra)])
    for s in profile.skills:
        parts.extend([s.name, s.items])
    parts.append(profile.summary)
    return " ".join(p for p in parts if p).lower()


def _extra_text(extra: dict | None) -> str:
    if not extra:
        return ""
    return " ".join(str(v) for v in extra.values() if isinstance(v, str))


def _job_text(job: Job) -> str:
    return " ".join(
        p for p in [job.title, job.location, job.requirements, job.description] if p
    ).lower()


def _hard_check(profile: Profile, pref: Preference | None, job: Job) -> tuple[int, list[str], list[str], bool]:
    """硬条件：城市匹配 + 学历完整 + 毕业年份。返回 (score, strengths, gaps, blocked)。"""
    score = 0
    strengths: list[str] = []
    gaps: list[str] = []
    blocked = False

    # 城市匹配
    pref_locs = (pref.locations if pref else None) or []
    job_loc = (job.location or "").strip()
    city_hit = bool(job_loc) and any(
        loc and (loc in job_loc or job_loc in loc) for loc in pref_locs
    )
    if city_hit:
        score += 12
        strengths.append(f"意向城市 {pref_locs} 覆盖岗位地点「{job_loc}」")
    elif job_loc and pref_locs:
        gaps.append(f"岗位地点「{job_loc}」不在意向城市 {pref_locs} 内")
        blocked = True

    # 学历完整（存在 education 经历）
    has_edu = any(e.type == "education" for e in profile.experiences)
    if has_edu:
        score += 10
        strengths.append("已有教育背景记录")
    else:
        gaps.append("缺少教育背景（学历硬条件无法确认）")
        blocked = True

    # 毕业年份
    grad_year = (pref.graduate_year if pref else "") or ""
    if grad_year.isdigit():
        score += 8
        strengths.append(f"毕业年份 {grad_year} 可确认应届身份")
    else:
        gaps.append("未确认毕业年份（应届身份不明确）")
        blocked = True

    return score, strengths, gaps, blocked


def _keyword_check(profile: Profile, job: Job) -> tuple[int, list[str], list[str], list[dict]]:
    """关键词层：JD 中出现且画像也命中的词为优势，仅 JD 出现为缺口。"""
    p_text = _profile_text(profile)
    j_text = _job_text(job)
    matched: list[str] = []
    missing: list[str] = []
    evidence: list[dict] = []
    for kw in KEYWORD_DICT:
        in_job = kw in j_text
        if not in_job:
            continue
        in_profile = kw in p_text
        evidence.append({"keyword": kw, "in_job": True, "in_profile": in_profile})
        if in_profile:
            matched.append(kw)
        else:
            missing.append(kw)
    score = min(KEYWORD_MAX, len(matched) * 4)
    return score, matched, missing, evidence


def analyze_match(profile: Profile, pref: Preference | None, job: Job) -> MatchReport:
    """生成并返回（未落库）MatchReport。"""
    hard_score, hard_strengths, hard_gaps, blocked = _hard_check(profile, pref, job)
    kw_score, kw_matched, kw_missing, evidence = _keyword_check(profile, job)

    total = hard_score + kw_score
    strengths = hard_strengths + ([f"JD 关键词命中 {len(kw_matched)} 个：{'、'.join(kw_matched[:10])}" if kw_matched else ""] if kw_matched else [])
    gaps = hard_gaps + ([f"JD 关键词未覆盖：{'、'.join(kw_missing[:10])}" if kw_missing else ""] if kw_missing else [])

    report = MatchReport(
        profile_id=profile.id,
        job_id=job.id,
        scores={
            "hard": hard_score,
            "hard_max": HARD_MAX,
            "keyword": kw_score,
            "keyword_max": KEYWORD_MAX,
            "total": total,
            "total_max": HARD_MAX + KEYWORD_MAX,
        },
        strengths=[s for s in strengths if s],
        gaps=[g for g in gaps if g],
        evidence=evidence,
        blocked=blocked,
    )
    return report
