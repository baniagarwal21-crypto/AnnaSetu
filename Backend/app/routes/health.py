from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db, db_status
from app.services.ml_forecast import model_version

router = APIRouter(tags=["Health & Status"])

@router.get("/health")
def get_health_status(db: Session = Depends(get_db)):
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception as e:
        db_ok = False

    return {
        "status": "healthy" if db_ok else "degraded",
        "service": "AnnaSetu Full-Stack Platform API",
        "database": {
            "status": "connected" if db_ok else "error",
            "engine": db_status["engine"],
            "is_demonstration_fallback": db_status["is_fallback"],
            "url_display": db_status["url_display"],
            "note": db_status["note"]
        },
        "ml_engine": {
            "status": "active",
            "model_loaded": model_version != "None",
            "model_version": model_version
        }
    }
