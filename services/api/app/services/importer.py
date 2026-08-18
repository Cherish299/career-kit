"""Resume Kit JSON 导入：把现有简历工作台导出的 JSON（version 1/2）映射为 Profile 结构。

数据流：resume-kit 导出 JSON → Profile（resume_json 保留原始快照）
         + Experience / Skill / Preference（结构化，供匹配与生成复用）。
"""
from __future__ import annotations

from app.models import Experience, Preference, Profile, Skill


def _t(v) -> str:
    return "" if v is None else str(v).strip()


def _month_year(v) -> str:
    """宽松归一化 "2024-09" / "2024-09-01" / 原样返回（含"至今"）。"""
    s = _t(v)
    if not s:
        return ""
    if s.lower() in ("至今", "now", "present", "current"):
        return "至今"
    parts = s.replace("/", "-").replace(".", "-").split("-")
    if len(parts) >= 2 and parts[0].isdigit():
        return f"{parts[0]}-{parts[1].zfill(2)}"
    return s


def import_resume_kit_json(payload: dict) -> tuple[Profile, list[str]]:
    """解析 Resume Kit JSON 为 Profile；返回 (profile, warnings)。"""
    warnings: list[str] = []
    data = payload.get("resume", payload) if isinstance(payload, dict) else {}
    if not isinstance(data, dict) or "basic" not in data:
        raise ValueError("无法识别的 Resume Kit JSON：缺少 resume.basic")

    basic = data.get("basic") or {}
    target = data.get("target") or {}

    profile = Profile(
        display_name=_t(basic.get("name")),
        summary=_t(data.get("evaluation")),
        visibility="private",
        resume_json=data,
    )

    # ---- 教育背景 ----
    for i, e in enumerate(data.get("education") or []):
        profile.experiences.append(
            Experience(
                type="education",
                title=_t(e.get("school")),
                role=_t(e.get("degree")),
                organization=_t(e.get("major")),
                start_date=_month_year(e.get("start")),
                end_date=_month_year(e.get("end")),
                content="",
                order_index=i,
                extra={"gpa": _t(e.get("gpa")), "rank": _t(e.get("rank")),
                       "courses": _t(e.get("courses")), "honors": _t(e.get("honors"))},
            )
        )

    # ---- 实习经历 ----
    for i, it in enumerate(data.get("internships") or []):
        profile.experiences.append(
            Experience(
                type="internship",
                title=_t(it.get("company")),
                role=_t(it.get("title")),
                start_date=_month_year(it.get("start")),
                end_date=_month_year(it.get("end")),
                content=_t(it.get("content")),
                order_index=i,
            )
        )

    # ---- 项目经历 ----
    for i, p in enumerate(data.get("projects") or []):
        profile.experiences.append(
            Experience(
                type="project",
                title=_t(p.get("name")),
                role=_t(p.get("role")),
                start_date=_month_year(p.get("start")),
                end_date=_month_year(p.get("end")),
                content=_t(p.get("content")),
                order_index=i,
                extra={"tech": _t(p.get("tech"))},
            )
        )

    # ---- 校园经历 ----
    for i, c in enumerate(data.get("campus") or []):
        profile.experiences.append(
            Experience(
                type="campus",
                title=_t(c.get("org")),
                role=_t(c.get("role")),
                start_date=_month_year(c.get("start")),
                end_date=_month_year(c.get("end")),
                content=_t(c.get("content")),
                order_index=i,
            )
        )

    # ---- 科研成果（论文/专利/软著/竞赛） ----
    for i, r in enumerate(data.get("research") or []):
        title = _t(r.get("title"))
        if not title:
            warnings.append(f"科研成果第 {i + 1} 条名称为空，已跳过")
            continue
        profile.experiences.append(
            Experience(
                type="research",
                title=title,
                role=_t(r.get("role")),
                start_date=_month_year(r.get("date")),
                content=_t(r.get("note")),
                order_index=i,
                extra={"kind": _t(r.get("kind")), "venue": _t(r.get("venue"))},
            )
        )

    # ---- 荣誉奖项 ----
    for i, a in enumerate(data.get("awards") or []):
        profile.experiences.append(
            Experience(
                type="award",
                title=_t(a.get("name")),
                start_date=_month_year(a.get("date")),
                order_index=i,
                extra={"level": _t(a.get("level"))},
            )
        )

    # ---- 技能 ----
    for s in data.get("skills") or []:
        category, items = _t(s.get("category")), _t(s.get("items"))
        if not items:
            continue
        profile.skills.append(Skill(name=category or "未分类", items=items))

    # ---- 求职偏好 ----
    roles = [t for t in [_t(target.get("position"))] if t]
    locations = [t for t in [_t(target.get("city"))] if t]
    industries = [t for t in [_t(target.get("industry"))] if t]
    job_types = [t for t in [_t(target.get("jobType"))] if t]
    if not roles and not locations:
        warnings.append("求职意向为空，Preference 仅保留基本信息")

    # 毕业年份：取最高学历（第一条教育）结束时间
    graduate_year = ""
    if profile.experiences:
        edu = next((e for e in profile.experiences if e.type == "education"), None)
        if edu and edu.end_date and edu.end_date[:4].isdigit():
            graduate_year = edu.end_date[:4]

    profile.preference = Preference(
        roles=roles,
        locations=locations,
        industries=industries,
        job_types=job_types,
        salary_expectation=_t(target.get("salary")),
        graduate_year=graduate_year,
        availability=_t(target.get("availability")),
    )

    return profile, warnings
