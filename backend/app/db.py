"""
The one psycopg connection pool for the process. Opened in main.py's
lifespan handler at startup, closed at shutdown — nowhere else calls
ConnectionPool() directly, so there is never more than one pool alive.

In STUB_MODE the pool is never opened at all: every router currently reads
fixtures (services/stub.py), so there is nothing to query yet, and trying to
connect to a database that may not exist would turn `uvicorn --reload` into
a crash loop for anyone who hasn't set up Postgres locally.
"""

import logging

from psycopg_pool import ConnectionPool

from app.config import settings

logger = logging.getLogger("app.db")

pool: ConnectionPool | None = None


def open_pool() -> None:
    global pool
    if settings.stub_mode:
        logger.info("STUB_MODE=1 — not opening a database pool")
        return
    pool = ConnectionPool(settings.database_url, min_size=1, max_size=10, open=True)
    logger.info("database pool opened")


def close_pool() -> None:
    global pool
    if pool is not None:
        pool.close()
        pool = None
        logger.info("database pool closed")


def get_pool() -> ConnectionPool:
    if pool is None:
        raise RuntimeError(
            "database pool is not open — either STUB_MODE=1 (nothing should be "
            "querying the DB yet) or open_pool() was not called at startup"
        )
    return pool
