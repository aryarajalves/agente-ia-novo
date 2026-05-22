from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy import create_engine
import os
import logging
from dotenv import load_dotenv

# Logger configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

connect_args = {}
if DATABASE_URL and "postgresql" in DATABASE_URL:
    connect_args["prepared_statement_cache_size"] = 0

# Engine Assíncrono (FastAPI)
engine = create_async_engine(
    DATABASE_URL, 
    echo=False,
    pool_size=20,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=300,
    pool_pre_ping=True,
    connect_args=connect_args,
)

async_session = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

# Engine Síncrono (Celery / Scripts)
SYNC_DATABASE_URL = DATABASE_URL.replace("+asyncpg", "")
engine_sync = create_engine(SYNC_DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_sync)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with async_session() as session:
        yield session
