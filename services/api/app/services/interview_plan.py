"""Generate a minimal interview plan from Job + Profile evidence.

第 8 周深化：主题规则命中后，直接从 legacy interview-kit 导出的
结构化题库（interview_questions.json，见 legacy/interview-kit/scripts/export-questions.mjs）
按分类抽题，替代内置手写小题库，实现真实题库联动。
"""
from __future__ import annotations

import json
from pathlib import Path

from app.models import Application, InterviewPlan, Job, Profile
from app.services.matcher import KEYWORD_DICT

TOPIC_RULES = [
    {"key": "rag", "cat": "rag", "label": "RAG 与检索", "keywords": ["rag", "embedding", "vector", "faiss", "chroma", "bm25", "召回", "检索"]},
    {"key": "agent", "cat": "agent", "label": "Agent 与工具调用", "keywords": ["agent", "function calling", "工具调用", "prompt"]},
    {"key": "llm", "cat": "llm", "label": "大模型应用基础", "keywords": ["llm", "大模型", "transformers", "pytorch", "微调"]},
    {"key": "backend", "cat": "ml", "label": "后端与工程化", "keywords": ["python", "fastapi", "sql", "redis", "docker", "pytest"]},
    {"key": "kg", "cat": "kg", "label": "知识图谱与图数据", "keywords": ["neo4j", "知识图谱", "cypher", "entity"]},
]

_QUESTIONS_FILE = Path(__file__).resolve().parent / "interview_questions.json"


def _load_question_bank() -> list[dict]:
    if not _QUESTIONS_FILE.is_file():
        return []
    with _QUESTIONS_FILE.open(encoding="utf-8") as fh:
        return json.load(fh)


QUESTION_BANK: list[dict] = _load_question_bank()


def _pick_questions(cat: str, limit: int = 2) -> list[dict]:
    """从题库按分类抽题：优先 short / choice，难度 1-2，控制总数。"""
    pool = [
        q
        for q in QUESTION_BANK
        if q.get("cat") == cat and q.get("type") in {"short", "choice"} and q.get("diff", 9) <= 2
    ]
    if not pool:
        pool = [q for q in QUESTION_BANK if q.get("cat") == cat]
    return pool[:limit]


def generate_interview_plan(application: Application, profile: Profile, job: Job) -> InterviewPlan:
    job_text = " ".join(part for part in [job.title, job.requirements, job.description] if part).lower()
    profile_text = " ".join(
        [profile.summary]
        + [exp.title + " " + exp.content for exp in profile.experiences]
        + [skill.name + " " + skill.items for skill in profile.skills]
    ).lower()

    topics: list[dict] = []
    questions: list[dict] = []
    seen_categories: set[str] = set()

    for rule in TOPIC_RULES:
        hits = [kw for kw in rule["keywords"] if kw in job_text]
        if not hits:
            continue
        seen_categories.add(rule["key"])
        topics.append(
            {
                "topic": rule["label"],
                "category": rule["key"],
                "reason": f"JD 命中关键词：{'、'.join(hits[:4])}",
                "matched_keywords": hits[:6],
            }
        )
        for item in _pick_questions(rule["cat"], limit=2):
            questions.append(
                {
                    "question_id": item["id"],
                    "question": item["q"],
                    "category": rule["key"],
                    "reason": f"来自 legacy 题库 {rule['cat']} 分类：{rule['label']}",
                    "job_id": job.id,
                }
            )

    project_experiences = [exp for exp in profile.experiences if exp.type in {"project", "internship", "research"}]
    if project_experiences:
        exp = project_experiences[0]
        topics.append(
            {
                "topic": "项目深挖",
                "category": "behavior",
                "reason": f"优先追问与你岗位最相关的经历：{exp.title}",
                "experience_id": exp.id,
            }
        )
        behavior_questions = _pick_questions("behavior", limit=1)
        for item in behavior_questions:
            questions.append(
                {
                    "question_id": item["id"],
                    "question": item["q"],
                    "category": "behavior",
                    "reason": f"结合经历《{exp.title}》准备的题库行为题",
                    "experience_id": exp.id,
                    "job_id": job.id,
                }
            )
        if any(kw in profile_text for kw in KEYWORD_DICT):
            questions.append(
                {
                    "question_id": f"proj-{exp.id[:8]}",
                    "question": f"如果面试官追问《{exp.title}》中的技术取舍、指标和失败案例，你会怎么展开？",
                    "category": "behavior",
                    "reason": f"结合项目经历《{exp.title}》生成的定向追问",
                    "experience_id": exp.id,
                    "job_id": job.id,
                }
            )

    if not topics:
        topics.append({"topic": "通用岗位理解", "category": "behavior", "reason": "JD 未命中特定主题，先准备岗位理解与项目亮点"})
        questions.append(
            {
                "question_id": "general-001",
                "question": "请介绍你为什么适合这个岗位，以及你最相关的一段经历。",
                "category": "behavior",
                "reason": "通用兜底问题",
                "job_id": job.id,
            }
        )

    return InterviewPlan(application_id=application.id, topics=topics, questions=questions, progress=0)
