from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.schemas import IoTUnitResponse, IoTSimulateRequest
from app.services.iot_service import refresh_iot_telemetry, trigger_iot_anomaly

router = APIRouter(prefix="/iot", tags=["IoT Quality & Storage Monitoring"])

@router.get("/units", response_model=List[IoTUnitResponse])
def get_iot_units(db: Session = Depends(get_db)):
    units = refresh_iot_telemetry(db, simulate_fluctuations=True)
    return units

@router.post("/simulate-anomaly", response_model=IoTUnitResponse)
def simulate_anomaly(payload: IoTSimulateRequest, db: Session = Depends(get_db)):
    try:
        unit = trigger_iot_anomaly(
            db,
            unit_id=payload.unit_id,
            spike_temp=payload.temperature_c,
            spike_gas=payload.gas_ppm
        )
        return unit
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
