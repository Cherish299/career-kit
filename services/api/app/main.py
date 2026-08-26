"""FastAPI 应用入口：健康检查 + 路由注册 + 前端静态服务。"""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routers import application, interview, job, match, offer, profile, resume
from app.core.config import settings
import app.models  # noqa: F401  # 注册全部模型到 Base.metadata
from app.db.base import Base
from app.db.session import engine


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # 开发期自动建表；生产环境使用 alembic upgrade head（见 alembic/）
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="CareerOS API",
    description="个人求职操作系统后端：画像 / 岗位 / 匹配 / 简历版本 / 投递",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 开发期放开；生产收敛到部署域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", tags=["system"])
def health() -> dict:
    return {"status": "ok", "debug": settings.debug}


app.include_router(profile.router, prefix="/api/profiles", tags=["profile"])
app.include_router(job.router, prefix="/api/jobs", tags=["job"])
app.include_router(match.router, prefix="/api/matches", tags=["match"])
app.include_router(resume.router, prefix="/api/resume-versions", tags=["resume"])
app.include_router(application.router, prefix="/api/applications", tags=["application"])
app.include_router(interview.router, prefix="/api/interview-plans", tags=["interview"])
app.include_router(offer.router, prefix="/api/offer", tags=["offer"])

# 前端静态文件（apps/web）：uvicorn app.main:app 后浏览器打开 http://127.0.0.1:8000
_web_dir = Path(__file__).resolve().parents[3] / "apps" / "web"


@app.get("/public/{slug}", include_in_schema=False)
def public_profile_page(slug: str):
    page = _web_dir / "public.html"
    if not page.is_file():
        raise FileNotFoundError(page)
    return FileResponse(page)


if _web_dir.is_dir():
    app.mount("/", StaticFiles(directory=_web_dir, html=True), name="web")
