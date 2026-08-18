"""FastAPI 应用入口：健康检查 + 路由注册。"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers import application, job, match, profile, resume
from app.core.config import settings

app = FastAPI(
    title="CareerOS API",
    description="个人求职操作系统后端：画像 / 岗位 / 匹配 / 简历版本 / 投递",
    version="0.1.0",
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
