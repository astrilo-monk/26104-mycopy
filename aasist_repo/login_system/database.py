import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase


load_dotenv()

DATABASE_URL = os.getenv("AUTH_DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "AUTH_DATABASE_URL must point to Supabase Postgres; SQLite is not supported for login users."
    )
if DATABASE_URL.startswith("sqlite"):
    raise RuntimeError("AUTH_DATABASE_URL must use Supabase Postgres, not SQLite.")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()
