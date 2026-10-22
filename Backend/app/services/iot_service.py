import random
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import IoTTelemetry, Notification

def get_or_create_default_units(db: Session) -> list[IoTTelemetry]:
    units = db.query(IoTTelemetry).all()
    if not units:
        defaults = [
            IoTTelemetry(unit_name="Cold Storage Room A", unit_type="cold_room", temperature_c=3.4, gas_ppm=140.0, status="normal"),
            IoTTelemetry(unit_name="Hot-Hold Serving Counter", unit_type="hot_hold", temperature_c=66.5, gas_ppm=95.0, status="normal"),
            IoTTelemetry(unit_name="Dry Grain & Bakery Store", unit_type="dry_store", temperature_c=25.2, gas_ppm=110.0, status="normal"),
        ]
        db.add_all(defaults)
        db.commit()
        units = db.query(IoTTelemetry).all()
    return units

def refresh_iot_telemetry(db: Session, simulate_fluctuations: bool = True) -> list[IoTTelemetry]:
    units = get_or_create_default_units(db)
    
    if simulate_fluctuations:
        for u in units:
            # Small random drift
            if u.unit_type == "cold_room":
                u.temperature_c = round(3.2 + random.uniform(-0.8, 1.2), 1)
                u.gas_ppm = round(135.0 + random.uniform(-15, 25), 1)
                if u.temperature_c > 5.0 or u.gas_ppm > 300.0:
                    u.status = "critical" if u.gas_ppm > 300.0 or u.temperature_c > 8.0 else "warning"
                else:
                    u.status = "normal"
            elif u.unit_type == "hot_hold":
                u.temperature_c = round(65.0 + random.uniform(-2.5, 3.5), 1)
                u.gas_ppm = round(90.0 + random.uniform(-10, 15), 1)
                if u.temperature_c < 60.0 or u.gas_ppm > 250.0:
                    u.status = "critical" if u.temperature_c < 55.0 else "warning"
                else:
                    u.status = "normal"
            elif u.unit_type == "dry_store":
                u.temperature_c = round(24.5 + random.uniform(-1.0, 2.0), 1)
                u.gas_ppm = round(105.0 + random.uniform(-10, 20), 1)
                if u.temperature_c > 32.0 or u.gas_ppm > 280.0:
                    u.status = "warning"
                else:
                    u.status = "normal"
            u.updated_at = datetime.utcnow()
        db.commit()

    return units

def trigger_iot_anomaly(db: Session, unit_id: int, spike_temp: float = None, spike_gas: float = None) -> IoTTelemetry:
    unit = db.query(IoTTelemetry).filter(IoTTelemetry.id == unit_id).first()
    if not unit:
        raise ValueError("Unit not found")
    
    if spike_temp is not None:
        unit.temperature_c = spike_temp
    else:
        # Default spike
        if unit.unit_type == "cold_room":
            unit.temperature_c = 11.5
        elif unit.unit_type == "hot_hold":
            unit.temperature_c = 48.0
        else:
            unit.temperature_c = 38.0

    if spike_gas is not None:
        unit.gas_ppm = spike_gas
    else:
        unit.gas_ppm = 345.0  # High spoilage gas

    unit.status = "critical"
    unit.updated_at = datetime.utcnow()

    # Trigger notification
    notif = Notification(
        target_role="hostel_admin",
        title=f"🚨 Critical IoT Sensor Alert: {unit.unit_name}",
        message=f"Storage excursion detected! Temperature: {unit.temperature_c}°C, Gas: {unit.gas_ppm} ppm. Immediate inspection required.",
        type="iot_alert",
        is_read=False
    )
    db.add(notif)
    db.commit()
    db.refresh(unit)
    return unit
