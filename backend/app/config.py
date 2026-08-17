"""
Runtime settings, read once from the environment / .env at process start.
Never read os.environ directly anywhere else in backend/ — import `settings`
from here instead, so there is exactly one place that knows the variable
names and their defaults.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", protected_namespaces=())

    database_url: str = "postgresql://prgi:prgi@localhost:5432/prgi_titleguard"

    # Master stub switch: 1 = every stage returns fixture data (Prompt 4's
    # entire point — a real HTTP server the frontend can integrate against
    # today). Per-stage overrides live in services/pipeline.py's STUB dict,
    # not here, so a teammate's module can go live independently once it's
    # ready without waiting for everyone else's.
    stub_mode: bool = True

    model_name: str = "BAAI/bge-m3"
    log_level: str = "INFO"

    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:4173"]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
