"""Generate a minimal interview plan from Job + Profile evidence."""
from __future__ import annotations

from app.models import Application, InterviewPlan, Job, Profile
from app.services.matcher import KEYWORD_DICT

TOPIC_RULES = [
    {"key": "rag", "label": "RAG 与检索", "keywords": ["rag", "embedding", "vector", "faiss", "chroma", "bm25", "召回", "检索"]},
    {"key": "agent", "label": "Agent 与工具调用", "keywords": ["agent", "function calling", "工具调用", "prompt"]},
    {"key": "llm", "label": "大模型应用基础", "keywords": ["llm", "大模型", "transformers", "pytorch", "微调"]},
    {"key": "backend", "label": "后端与工程化", "keywords": ["python", "fastapi", "sql", "redis", "docker", "pytest"]},
    {"key": "kg", "label": "知识图谱与图数据", "keywords": ["neo4j", "知识图谱", "cypher", "entity"]},
]

QUESTION_BANK = {
    "rag": [
        {"question_id": "rag-001", "question": "简述 RAG 的完整链路，以及 chunking / recall / rerank 分别解决什么问题。", "category": "rag"},
        {"question_id": "rag-002", "question": "为什么很多 RAG 系统会采用 BM25 + 向量的混合检索？", "category": "rag"},
    ],
    "agent": [
        {"question_id": "agent-001", "question": "Function Calling 的原理是什么？如何配合 JSON Schema 保证参数可解析？", "category": "agent"},
        {"question_id": "agent-002", "question": "多阶段 Agent 工作流的中间产物应该如何设计和持久化？", "category": "agent"},
    ],
    "llm": [
        {"question_id": "llm-001", "question": "介绍 Transformer 的核心结构，以及 attention 为什么要除以 sqrt(dk)。", "category": "llm"},
        {"question_id": "llm-002", "question": "如果线上 LLM 成本过高，你会从 token、缓存和模型路由哪些方面优化？", "category": "llm"},
    ],
    "backend": [
        {"question_id": "backend-001", "question": "如果用 FastAPI 做 AI 应用后端，你会如何设计 API、校验和错误处理？", "category": "backend"},
        {"question_id": "backend-002", "question": "如何设计一个可追踪、可回放的岗位同步状态机与日志链路？", "category": "backend"},
    ],
    "kg": [
        {"question_id": "kg-001", "question": "Neo4j 在 AI 应用里常见的使用场景是什么？和关系型库怎么配合？", "category": "kg"},
        {"question_id": "kg-002", "question": "知识图谱的 schema、实体抽取与证据溯源应该如何串起来？", "category": "kg"},
    ],
    "behavior": [
        {"question_id": "behavior-001", "question": "请用 STAR 结构介绍一个与你申请岗位最相关的项目。", "category": "behavior"},
    ],
}


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
        for item in QUESTION_BANK.get(rule["key"], [])[:2]:
            questions.append(
                {
                    **item,
                    "reason": f"来自 JD 主题映射：{rule['label']}",
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
        questions.append(
            {
                **QUESTION_BANK["behavior"][0],
                "reason": f"结合经历《{exp.title}》准备项目追问",
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
