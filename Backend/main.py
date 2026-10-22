import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base, SessionLocal, db_status
from app.seed import seed_initial_data

from app.routes.health import router as health_router
from app.routes.forecast import router as forecast_router
from app.routes.surplus import router as surplus_router
from app.routes.claims import router as claims_router
from app.routes.routes_optimizer import router as routes_router
from app.routes.iot import router as iot_router
from app.routes.analytics import router as analytics_router
from app.routes.notifications import router as notifications_router
from app.routes.hardware import router as hardware_router
from app.routes.delivery_tracking import router as delivery_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("annasetu")

# Ensure all database schema tables exist immediately
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    
    # Seed demonstration data if database is fresh
    db = SessionLocal()
    try:
        seed_initial_data(db)
    finally:
        db.close()
    
    logger.info(f"AnnaSetu backend online with {db_status['engine']} storage.")
    yield
    logger.info("AnnaSetu backend shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AI-powered food-waste management, demand prediction, surplus matching, and ESG tracking for college hostels.",
    lifespan=lifespan
)

# Enable CORS for frontend development and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 Routers
app.include_router(health_router, prefix=settings.API_V1_PREFIX)
app.include_router(forecast_router, prefix=settings.API_V1_PREFIX)
app.include_router(surplus_router, prefix=settings.API_V1_PREFIX)
app.include_router(claims_router, prefix=settings.API_V1_PREFIX)
app.include_router(routes_router, prefix=settings.API_V1_PREFIX)
app.include_router(iot_router, prefix=settings.API_V1_PREFIX)
app.include_router(analytics_router, prefix=settings.API_V1_PREFIX)
app.include_router(notifications_router, prefix=settings.API_V1_PREFIX)
app.include_router(hardware_router, prefix=settings.API_V1_PREFIX)
app.include_router(delivery_router, prefix=settings.API_V1_PREFIX)

@app.get("/")
def read_root():
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "active",
        "docs_url": "/docs",
        "database_storage": db_status["engine"],
        "demonstration_mode": db_status["is_fallback"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
