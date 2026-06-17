from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings


class Base(DeclarativeBase):
    pass


settings = get_settings()
# SQLite不支持pool_pre_ping，根据数据库类型调整参数
connect_args = {"check_same_thread": False} if "sqlite" in settings.database_url else {}
engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_pre_ping="sqlite" not in settings.database_url,
    connect_args=connect_args,
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
