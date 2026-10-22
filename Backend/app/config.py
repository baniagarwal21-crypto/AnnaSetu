import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "AnnaSetu AI Food-Waste Management Platform"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    
    # Persistent storage configuration
    # By default, checks for POSTGRES_URL or DATABASE_URL. If not available or fails, falls back gracefully to SQLite demo mode.
    DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL", None)
    FALLBACK_SQLITE_URL: str = "sqlite:///./annasetu.db"
    
    # ML model paths
    ML_MODEL_PATH: str = os.getenv("ML_MODEL_PATH", "../ML/mess_model.joblib")
    BACKUP_MODEL_PATH: str = os.getenv("BACKUP_MODEL_PATH", "mess_rfr_model.joblib")
    CALENDAR_CSV_PATH: str = os.getenv("CALENDAR_CSV_PATH", "../ML/Holidays_final_fixed.csv")
    ATTENDANCE_CSV_PATH: str = os.getenv("ATTENDANCE_CSV_PATH", "../ML/Mess_attendance_dataset_fixed.csv")
    
    # Portion sizes in kg per diner
    PORTION_SIZES: dict = {
        "breakfast": 0.25,  # 250g
        "lunch": 0.40,      # 400g
        "dinner": 0.35       # 350g
    }
    
    # Emission factor (kg CO2e per kg food saved) and standard valuation (INR per kg)
    EMISSION_FACTORS: dict = {
        "Cooked rice and grains": 2.7,
        "Dairy and paneer gravies": 4.2,
        "Bakery items": 1.3,
        "Fresh produce": 0.9,
        "General cooked food": 2.5
    }
    VALUE_PER_KG_INR: float = 70.0

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
