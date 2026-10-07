import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "")

# Neon / PostgreSQL asyncpg compatibility
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# Neon-এর সাথে SSL এবং asyncpg অপ্টিমাইজেশন
engine = create_async_engine(
    DATABASE_URL,
    pool_size=15,          # Neon Free Tier-এর সাথে সামঞ্জস্যপূর্ণ মূল পুল সাইজ
    max_overflow=10,       # পিক টাইমে অতিরিক্ত ১০টি কানেকশন সামলাবে
    pool_timeout=30,       # লাইনে কানেকশন পেতে সর্বোচ্চ ৩০ সেকেন্ড অপেক্ষা করবে
    pool_recycle=300,      # প্রতি ৫ মিনিটে কানেকশন রিফ্রেশ করবে (Dead connection আটকায়)
    pool_pre_ping=True,    # ড্রপ হওয়া কানেকশনে কুয়েরি পাঠানো আটকাবে
    connect_args={
        "ssl": "require",
        "command_timeout": 60,
    }
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()