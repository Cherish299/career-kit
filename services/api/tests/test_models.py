"""ORM 模型测试：建表、创建、关系、级联。"""
import pytest
from sqlalchemy.exc import IntegrityError

from app.models import (
    Application,
    ApplicationEvent,
    Company,
    Experience,
    Job,
    Preference,
    Profile,
    Skill,
)


def test_create_profile_with_relations(db_session):
    profile = Profile(
        display_name="测试用户",
        visibility="private",
        resume_json={"app": "resume-kit", "version": 2},
    )
    profile.experiences.append(
        Experience(
            type="project",
            title="EcoMINER 文献抽取系统",
            role="核心开发",
            start_date="2025-11",
            end_date="至今",
            content="多阶段抽取工作流\nLLM/VLM 多模态",
            extra={"tech": "FastAPI/Neo4j"},
        )
    )
    profile.skills.append(Skill(name="RAG 与数据", items="FAISS、Chroma、Neo4j", level="掌握"))
    profile.preference = Preference(
        roles=["AI 应用开发", "RAG 后端"],
        locations=["深圳", "广州", "北京"],
        industries=["互联网"],
        graduate_year="2027",
    )
    db_session.add(profile)
    db_session.commit()

    got = db_session.get(Profile, profile.id)
    assert got.display_name == "测试用户"
    assert len(got.experiences) == 1
    assert got.experiences[0].end_date == "至今"
    assert got.experiences[0].extra["tech"] == "FastAPI/Neo4j"
    assert len(got.skills) == 1
    assert got.preference.graduate_year == "2027"
    assert got.resume_json["version"] == 2


def test_create_job_and_application_chain(db_session):
    profile = Profile(display_name="测试用户")
    company = Company(name="某科技公司", aliases=["某厂"], industry="互联网")
    db_session.add_all([profile, company])
    db_session.commit()

    job = Job(title="AI 应用开发工程师", company_id=company.id, location="深圳", source="manual")
    db_session.add(job)
    db_session.commit()

    app = Application(profile_id=profile.id, job_id=job.id, status="discovered")
    app.events.append(
        ApplicationEvent(
            event_type="status_change", from_status="", to_status="discovered", note="创建投递"
        )
    )
    db_session.add(app)
    db_session.commit()

    got = db_session.get(Application, app.id)
    assert got.status == "discovered"
    assert len(got.events) == 1
    assert got.events[0].to_status == "discovered"
    assert got.job_id == job.id


def test_profile_delete_cascades_experiences(db_session):
    profile = Profile(display_name="待删")
    profile.experiences.append(Experience(type="education", title="某大学"))
    db_session.add(profile)
    db_session.commit()

    pid = profile.id
    db_session.delete(profile)
    db_session.commit()

    assert db_session.get(Profile, pid) is None
    # 级联删除经历
    assert db_session.query(Experience).filter_by(profile_id=pid).count() == 0


def test_job_snapshot_unique_per_job_content_hash(db_session):
    company = Company(name="快照公司")
    job = Job(title="爬虫工程师", company=company, source="crawler")
    db_session.add_all([company, job])
    db_session.commit()

    from app.models import JobSnapshot

    s1 = JobSnapshot(job_id=job.id, content_hash="abc123", raw_content="first")
    s2 = JobSnapshot(job_id=job.id, content_hash="abc123", raw_content="duplicate")
    db_session.add_all([s1, s2])
    with pytest.raises(IntegrityError):
        db_session.commit()


def test_job_source_and_external_id_must_be_unique(db_session):
    j1 = Job(title="算法工程师", source="crawler", external_id="job-001")
    j2 = Job(title="算法工程师-重复", source="crawler", external_id="job-001")
    db_session.add_all([j1, j2])
    with pytest.raises(IntegrityError):
        db_session.commit()
