"""应用配置（环境变量驱动，密钥仅在服务端）。"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="CAREER_", env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://career:career@localhost:5432/career_os"
    debug: bool = False


settings = Settings()
