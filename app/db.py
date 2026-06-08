from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.config import settings

engine = create_async_engine(
    settings.database_url,
    echo=settings.is_development,
    pool_size=5,
    max_overflow=10,
    connect_args={"ssl": "require"} if "supabase.co" in settings.database_url else {},
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
