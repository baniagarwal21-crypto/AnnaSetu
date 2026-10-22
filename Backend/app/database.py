import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

logger = logging.getLogger("annasetu.database")

Base = declarative_base()

def get_engine_and_status():
    db_url = settings.DATABASE_URL
    if db_url and db_url.strip():
        try:
            # Handle postgresql:// vs postgresql+psycopg2:// if needed
            cleaned_url = db_url.replace("postgres://", "postgresql://")
            eng = create_engine(cleaned_url, pool_pre_ping=True)
            with eng.connect() as conn:
                logger.info(" Connected successfully to PostgreSQL database!")
            return eng, {
                "engine": "postgresql",
                "is_fallback": False,
                "url_display": cleaned_url.split("@")[-1] if "@" in cleaned_url else "configured-postgres",
                "note": "Using persistent PostgreSQL database."
            }
        except Exception as e:
            logger.warning(f"[WARNING] PostgreSQL connection failed ({e}). Falling back to persistent SQLite demo storage.")

    # Fallback to persistent SQLite
    sqlite_url = settings.FALLBACK_SQLITE_URL
    eng = create_engine(sqlite_url, connect_args={"check_same_thread": False})
    return eng, {
        "engine": "sqlite",
        "is_fallback": True,
        "url_display": sqlite_url,
        "note": "Operating in Safe Demonstration Mode with persistent local SQLite storage. Connect PostgreSQL by configuring DATABASE_URL."
    }

engine, db_status = get_engine_and_status()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
