"""API 集成测试：导入 / 岗位 / 匹配 / 投递状态机 / 简历版本（SQLite 内存库）。"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.db.base import Base
from app.main import app

# 匿名化的 Resume Kit JSON 样本（结构对齐 resume-kit v2 导出）
SAMPLE_RESUME = {
    "app": "resume-kit",
    "version": 2,
    "resume": {
        "basic": {
            "name": "示例用户",
            "phone": "13800000000",
            "email": "demo@example.com",
            "city": "北京",
        },
        "target": {
            "position": "AI 应用开发",
            "industry": "互联网",
            "city": "深圳/广州/北京",
            "salary": "20-25k",
            "availability": "2027.7月",
            "jobType": "校招",
        },
        "education": [
            {
                "school": "示例大学",
                "major": "控制科学与工程",
                "degree": "硕士",
                "start": "2024-09",
                "end": "2027-06",
                "gpa": "3.4",
                "courses": "模式识别与人工智能",
            }
        ],
        "internships": [
            {
                "company": "示例数据中心",
                "title": "AI 开发实习生",
                "start": "2025-07",
                "end": "至今",
                "content": "实现 LLM/VLM 结构化抽取能力\nSchema 校验与有限重试",
            }
        ],
        "projects": [
            {
                "name": "示例文献抽取系统",
                "role": "核心开发",
                "tech": "Python / FastAPI / Neo4j / FAISS",
                "content": "多阶段抽取工作流\nRAG 语义回填",
            }
        ],
        "campus": [],
        "research": [],
        "awards": [],
        "skills": [
            {"category": "RAG 与数据", "items": "FAISS、Chroma、Neo4j、RDFLib"},
            {"category": "LLM 应用", "items": "Prompt 设计、结构化输出、Schema 校验"},
        ],
        "evaluation": "独立完成抽取系统",
        "extra": "",
    },
}


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,  # 内存库单连接共享（TestClient 跨线程）
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, expire_on_commit=False)

    def override_get_db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
    engine.dispose()


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_import_resume_kit_json(client):
    """#3：导入 Resume Kit JSON → Profile 结构化。"""
    r = client.post("/api/profiles", json={"resume_json": SAMPLE_RESUME})
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["display_name"] == "示例用户"
    types = {e["type"] for e in data["experiences"]}
    assert {"education", "internship", "project"} <= types
    edu = next(e for e in data["experiences"] if e["type"] == "education")
    assert edu["start_date"] == "2024-09" and edu["end_date"] == "2027-06"
    intern = next(e for e in data["experiences"] if e["type"] == "internship")
    assert intern["end_date"] == "至今"
    assert len(data["skills"]) == 2
    pref = data["preference"]
    assert "AI 应用开发" in pref["roles"]
    assert pref["graduate_year"] == "2027"


def test_public_profile_returns_whitelisted_fields_only(client):
    created = client.post(
        "/api/profiles",
        json={
            "display_name": "张三",
            "summary": "AI 应用开发候选人",
            "visibility": "public",
            "public_slug": "zhang-san-ai",
            "public_fields": ["display_name", "summary", "skills", "projects"],
            "experiences": [
                {"type": "project", "title": "CareerOS", "organization": "个人项目", "content": "做求职工作台"},
                {"type": "education", "title": "某大学", "organization": "计算机学院", "content": "本科"}
            ],
            "skills": [{"name": "后端", "items": "Python,FastAPI", "level": "熟练"}],
            "preference": {"roles": ["AI 应用开发"], "salary_expectation": "30k"}
        },
    )
    assert created.status_code == 201, created.text
    profile = created.json()
    assert profile["public_slug"] == "zhang-san-ai"

    public = client.get("/api/profiles/public/zhang-san-ai")
    assert public.status_code == 200, public.text
    data = public.json()
    assert data["display_name"] == "张三"
    assert data["summary"] == "AI 应用开发候选人"
    assert len(data["skills"]) == 1
    assert len(data["experiences"]) == 1
    assert data["experiences"][0]["title"] == "CareerOS"
    assert "salary_expectation" not in str(data)

    private = client.post(
        "/api/profiles",
        json={"display_name": "李四", "visibility": "private", "public_slug": "li-si"},
    ).json()
    missing = client.get("/api/profiles/public/li-si")
    assert missing.status_code == 404


def test_job_and_match_flow(client):
    """#4 + #5：录入 JD → 规则匹配 → 可解释报告。"""
    profile = client.post("/api/profiles", json={"resume_json": SAMPLE_RESUME}).json()

    job_payload = {
        "title": "AI 应用开发工程师（RAG 方向）",
        "location": "深圳",
        "source": "manual",
        "company_name": "示例科技公司",
        "requirements": "熟悉 Python、FastAPI、RAG 与向量检索，了解大模型应用",
        "description": "负责 RAG 后端开发，使用 Neo4j 构建知识图谱",
    }
    r = client.post("/api/jobs", json=job_payload)
    assert r.status_code == 201, r.text
    job = r.json()
    assert job["company_id"] is not None
    assert job["company_name"] == "示例科技公司"

    mr = client.post("/api/matches/analyze", params={"profile_id": profile["id"], "job_id": job["id"]})
    assert mr.status_code == 200, mr.text
    report = mr.json()
    assert report["blocked"] is False  # 城市深圳在意向内
    assert report["scores"]["total"] > 0
    assert any(e["in_job"] and e["in_profile"] for e in report["evidence"])
    assert any(g for g in report["gaps"]) or any(s for s in report["strengths"])


def test_application_state_machine_via_api(client):
    """#7：创建投递 → 状态机流转 + 事件溯源；非法转换 422。"""
    profile = client.post("/api/profiles", json={"resume_json": SAMPLE_RESUME}).json()
    job = client.post(
        "/api/jobs", json={"title": "后端开发", "location": "北京", "source": "manual"}
    ).json()

    app_r = client.post(
        "/api/applications",
        json={"profile_id": profile["id"], "job_id": job["id"], "status": "discovered"},
    )
    assert app_r.status_code == 201
    app_id = app_r.json()["id"]
    assert len(app_r.json()["events"]) == 1

    # 合法流转：待投递 → 已投递
    r = client.patch(f"/api/applications/{app_id}/status", json={"to_status": "to_submit"})
    assert r.status_code == 200
    r = client.patch(f"/api/applications/{app_id}/status", json={"to_status": "submitted"})
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "submitted"
    assert len(data["events"]) == 3  # 创建 + 2 次转换

    # 非法流转：已投递直接 → Offer（跳级）
    bad = client.patch(f"/api/applications/{app_id}/status", json={"to_status": "offer"})
    assert bad.status_code == 422

    # 终态冻结
    client.patch(f"/api/applications/{app_id}/status", json={"to_status": "rejected"})
    frozen = client.patch(f"/api/applications/{app_id}/status", json={"to_status": "submitted"})
    assert frozen.status_code == 422


def test_job_favorite_filter_and_stale_marker(client):
    job = client.post(
        "/api/jobs",
        json={
            "title": "收藏岗位",
            "source": "crawler",
            "external_id": "favorite-1",
            "company_name": "收藏公司",
            "deadline": "2027-09-30",
        },
    ).json()
    assert job["is_favorite"] is False
    toggled = client.patch(f"/api/jobs/{job['id']}/favorite")
    assert toggled.status_code == 200
    assert toggled.json()["is_favorite"] is True
    favorite = client.get("/api/jobs?favorite=true")
    assert favorite.status_code == 200
    assert [row["id"] for row in favorite.json()] == [job["id"]]

    stale = client.post("/api/jobs/mark-stale?max_age_hours=0")
    assert stale.status_code == 200
    assert stale.json()["changed"] == 1
    assert client.get(f"/api/jobs/{job['id']}").json()["status"] == "stale"
    assert client.get("/api/jobs?include_stale=false").json() == []


def test_job_sync_creates_runs_dedupes_alerts_and_applies_deadline_threshold(client):
    created = client.post(
        "/api/jobs/sync",
        json={
            "source": "crawler",
            "rows": [
                {
                    "external_id": "sync-1",
                    "title": "AI 应用开发工程师",
                    "company_name": "同步科技",
                    "location": "深圳",
                    "requirements": "Python FastAPI",
                    "description": "负责 RAG 应用开发",
                    "deadline": "2027-09-30",
                }
            ],
        },
    )
    assert created.status_code == 200, created.text
    created_data = created.json()
    assert created_data["created"] == 1
    assert created_data["alerts_created"] == 0
    assert created_data["run_id"]

    job = client.get("/api/jobs").json()[0]
    client.patch(f"/api/jobs/{job['id']}/favorite")

    unchanged = client.post(
        "/api/jobs/sync",
        json={
            "source": "crawler",
            "rows": [
                {
                    "external_id": "sync-1",
                    "title": "AI 应用开发工程师",
                    "company_name": "同步科技",
                    "location": "深圳",
                    "requirements": "Python FastAPI",
                    "description": "负责 RAG 应用开发",
                    "deadline": "2027-09-30",
                }
            ],
        },
    )
    assert unchanged.status_code == 200
    assert unchanged.json()["unchanged"] == 1

    updated = client.post(
        "/api/jobs/sync",
        json={
            "source": "crawler",
            "rows": [
                {
                    "external_id": "sync-1",
                    "title": "AI 应用开发工程师",
                    "company_name": "同步科技",
                    "location": "深圳",
                    "requirements": "Python FastAPI Redis",
                    "description": "负责 RAG 应用开发与同步",
                    "deadline": "2026-08-30",
                }
            ],
        },
    )
    assert updated.status_code == 200
    assert updated.json()["updated"] == 1
    assert updated.json()["alerts_created"] == 2

    alerts = client.get("/api/jobs/alerts?unread_only=true")
    assert alerts.status_code == 200
    data = alerts.json()
    assert {row["type"] for row in data} == {"updated", "deadline"}

    rerun = client.post(
        "/api/jobs/sync",
        json={
            "source": "crawler",
            "deadline_days": 14,
            "rows": [
                {
                    "external_id": "sync-1",
                    "title": "AI 应用开发工程师",
                    "company_name": "同步科技",
                    "location": "深圳",
                    "requirements": "Python FastAPI Redis",
                    "description": "负责 RAG 应用开发与同步",
                    "deadline": "2026-08-30",
                }
            ],
        },
    )
    assert rerun.status_code == 200
    assert rerun.json()["unchanged"] == 1
    assert rerun.json()["alerts_created"] == 0

    runs = client.get("/api/jobs/sync-runs?source=crawler")
    assert runs.status_code == 200
    assert len(runs.json()) >= 3

    marked = client.patch(f"/api/jobs/alerts/{data[0]['id']}", json={"read": True})
    assert marked.status_code == 200
    assert marked.json()["read_at"] is not None

    closed = client.post("/api/jobs/sync", json={"source": "crawler", "rows": []})
    assert closed.status_code == 200
    assert closed.json()["closed"] == 1
    assert client.get(f"/api/jobs/{job['id']}").json()["status"] == "closed"


def test_job_snapshots_are_created_and_deduplicated(client):
    job = client.post(
        "/api/jobs",
        json={
            "title": "Python 爬虫工程师",
            "location": "深圳",
            "source": "crawler",
            "company_name": "快照科技",
            "description": "负责官网岗位采集与结构化解析",
        },
    ).json()

    snapshots = client.get(f"/api/jobs/{job['id']}/snapshots")
    assert snapshots.status_code == 200
    rows = snapshots.json()
    assert len(rows) == 1
    assert rows[0]["content_hash"]

    same = client.post(f"/api/jobs/{job['id']}/snapshots", json={"raw_content": "Python 爬虫工程师\n\n深圳\n\n负责官网岗位采集与结构化解析"})
    assert same.status_code == 201
    assert same.json()["id"] == rows[0]["id"]

    changed = client.post(f"/api/jobs/{job['id']}/snapshots", json={"raw_content": "负责官网岗位采集、去重与结构化解析"})
    assert changed.status_code == 201
    assert changed.json()["id"] != rows[0]["id"]

    rows_after = client.get(f"/api/jobs/{job['id']}/snapshots").json()
    assert len(rows_after) == 2


def test_job_create_reuses_same_source_and_external_id(client):
    payload = {
        "title": "后端开发工程师",
        "location": "深圳",
        "source": "crawler",
        "external_id": "job-001",
        "company_name": "复用科技",
        "description": "负责职位解析与岗位入库",
        "source_url": "https://example.com/jobs/001",
    }
    created = client.post("/api/jobs", json=payload)
    assert created.status_code == 201
    first = created.json()

    updated = client.post(
        "/api/jobs",
        json={
            **payload,
            "title": "资深后端开发工程师",
            "description": "负责职位解析、去重与岗位入库",
        },
    )
    assert updated.status_code == 201
    second = updated.json()
    assert second["id"] == first["id"]
    assert second["title"] == "资深后端开发工程师"
    assert second["company_name"] == "复用科技"

    jobs = client.get("/api/jobs").json()
    same_jobs = [j for j in jobs if j["source"] == "crawler" and j["external_id"] == "job-001"]
    assert len(same_jobs) == 1

    snapshots = client.get(f"/api/jobs/{first['id']}/snapshots").json()
    assert len(snapshots) == 2


def test_offer_import_api_returns_summary(client, monkeypatch):
    from app.services import offer_import

    async def fake_run_offer_import(payload, api_base):
        return {
            "source": "offerqingbaoju-info-summary",
            "api_base": api_base,
            "limit": payload.total_limit,
            "selectors": {"navigationNames": payload.navigation_names, "pageLimit": payload.page_limit, "totalLimit": payload.total_limit, "pageFallback": False},
            "selected": 2,
            "written": True,
            "imported": 2,
            "failed": 0,
            "results": [{"external_id": "60:1:1", "action": "reused"}],
            "summary": {"created": 0, "reused": 2, "failed": 0, "companies": 1},
        }

    monkeypatch.setattr(offer_import, "run_offer_import", fake_run_offer_import)
    response = client.post(
        "/api/offer/import",
        json={
            "limit": 1,
            "page_limit": 2,
            "total_limit": 3,
            "navigation_names": ["信息总表"],
            "title_keywords": ["AI"],
            "company_keywords": ["华为"],
            "location_keywords": ["深圳"],
            "graduate_years": ["2027"],
            "batch_keywords": ["秋招"],
            "report_format": "json",
        },
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["written"] is True
    assert data["summary"]["reused"] == 2


def test_offer_preview_api_returns_json_and_markdown(client, monkeypatch):
    from app.services import offer_preview

    async def fake_build_offer_preview(payload):
        if payload.report_format == "md":
            return {
                "source": "offerqingbaoju-info-summary",
                "limit": payload.total_limit,
                "selectors": {"navigationNames": payload.navigation_names, "pageLimit": payload.page_limit, "totalLimit": payload.total_limit, "pageFallback": False},
                "count": 1,
                "generated_at": "2026-08-20T00:00:00Z",
                "rows": None,
                "report_text": "# Offer Job Report\n\n### AI 工程师",
            }
        return {
            "source": "offerqingbaoju-info-summary",
            "limit": payload.total_limit,
            "selectors": {"navigationNames": payload.navigation_names, "pageLimit": payload.page_limit, "totalLimit": payload.total_limit, "pageFallback": False},
            "count": 1,
            "generated_at": "2026-08-20T00:00:00Z",
            "rows": [{"title": "AI 工程师"}],
            "report_text": None,
        }

    monkeypatch.setattr(offer_preview, "build_offer_preview", fake_build_offer_preview)

    json_preview = client.post(
        "/api/offer/preview",
        json={
            "limit": 1,
            "page_limit": 2,
            "total_limit": 3,
            "navigation_names": ["信息总表"],
            "title_keywords": ["AI"],
            "company_keywords": ["华为", "乐狗"],
            "location_keywords": ["全国", "深圳"],
            "graduate_years": ["2027", "2028"],
            "batch_keywords": ["秋招"],
            "report_format": "json",
        },
    )
    assert json_preview.status_code == 200, json_preview.text
    json_data = json_preview.json()
    assert json_data["count"] == 1
    assert json_data["rows"][0]["title"] == "AI 工程师"

    markdown_preview = client.post(
        "/api/offer/preview",
        json={
            "limit": 1,
            "page_limit": 2,
            "total_limit": 3,
            "navigation_names": ["信息总表"],
            "title_keywords": ["AI"],
            "company_keywords": ["华为", "乐狗"],
            "location_keywords": ["全国", "深圳"],
            "graduate_years": ["2027", "2028"],
            "batch_keywords": ["秋招"],
            "report_format": "md",
        },
    )
    assert markdown_preview.status_code == 200, markdown_preview.text
    markdown_data = markdown_preview.json()
    assert markdown_data["report_text"] is not None
    assert "Offer Job Report" in markdown_data["report_text"]


def test_resume_version_fork(client):
    """#6：母版 → 岗位定制副本（不覆盖母版）。"""
    profile = client.post("/api/profiles", json={"resume_json": SAMPLE_RESUME}).json()
    job = client.post(
        "/api/jobs", json={"title": "RAG 工程师", "location": "广州", "source": "manual"}
    ).json()

    master = client.post(
        "/api/resume-versions",
        json={
            "profile_id": profile["id"],
            "name": "母版",
            "content": "<div>简历内容</div>",
            "template_id": "tech",
            "style": "blue",
        },
    ).json()
    fork = client.post(
        f"/api/resume-versions/{master['id']}/fork",
        params={"job_id": job["id"], "name": "RAG 工程师-定向版"},
    )
    assert fork.status_code == 201
    data = fork.json()
    assert data["parent_id"] == master["id"]
    assert data["content"] == "<div>简历内容</div>"
    assert data["job_id"] == job["id"]

    master_after = client.get(f"/api/resume-versions/{master['id']}").json()
    assert master_after["content"] == "<div>简历内容</div>"  # 母版未被修改
