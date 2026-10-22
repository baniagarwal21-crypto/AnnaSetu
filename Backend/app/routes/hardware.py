import httpx
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import RFIDScan, FoodRecord, MealAttendance, Notification
from app.schemas import (
    RFIDTapRequest, RFIDTapResponse, RFIDScanLogResponse,
    FoodRecordCreate, FoodRecordResponse
)
from app.services.audit_chain import record_audit_entry
from app.config import settings

router = APIRouter(prefix="/hardware", tags=["Hardware & RFID Station"])

DEVICE_KEY = "dhruv"
GOOGLE_SHEETS_WEBHOOK = "https://script.google.com/macros/s/AKfycbxqJcX-T2udEzwD4Asr6NHrlukLkAAGKYQmMXMbXiH6umGau63hX_GDixy1Q3Ar-Pyu/exec"

STUDENTS = {
    "1E6B7E05": "Student 1 (Rohan Sharma)",
    "13CE022F": "Student 2 (Aayush Verma)",
    "A1B2C3D4": "Student 3 (Priya Singh)",
    "D4C3B2A1": "Student 4 (Ananya Roy)"
}

MEAL_HOURS = {
    "breakfast": (7, 10),
    "lunch": (12, 15),
    "dinner": (19, 22)
}

def determine_meal(override: Optional[str] = None) -> str:
    if override and override.lower() in ("breakfast", "lunch", "dinner"):
        return override.lower()
    
    # Current hour in local time (UTC+5:30)
    now = datetime.now()
    hour = now.hour
    for meal, (start, end) in MEAL_HOURS.items():
        if start <= hour < end:
            return meal
    
    # Default to closest meal for demonstration
    if hour < 11:
        return "breakfast"
    elif hour < 17:
        return "lunch"
    else:
        return "dinner"

async def forward_to_google_sheets(uid: str):
    try:
        async with httpx.AsyncClient(timeout=4.0, follow_redirects=True) as client:
            await client.post(GOOGLE_SHEETS_WEBHOOK, json={"key": DEVICE_KEY, "uid": uid})
    except Exception as e:
        print(f"[Hardware] Note: Google Sheets forward skipped/offline ({e})")

@router.post("/rfid-tap", response_model=RFIDTapResponse)
def handle_rfid_tap(
    payload: RFIDTapRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    # Verify Device Security Key
    if payload.key.strip() != DEVICE_KEY:
        raise HTTPException(status_code=401, detail="UNAUTHORIZED_DEVICE_KEY")

    clean_uid = payload.uid.strip().replace(" ", "").upper()
    student_name = STUDENTS.get(clean_uid, f"Student ({clean_uid})")

    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M:%S")
    meal = determine_meal(payload.meal_override)

    # Duplicate check: student already marked present for this meal today
    existing = db.query(RFIDScan).filter(
        RFIDScan.uid == clean_uid,
        RFIDScan.date == date_str,
        RFIDScan.meal == meal,
        RFIDScan.status == "PRESENT"
    ).first()

    if existing:
        return RFIDTapResponse(
            status="duplicate",
            message="ALREADY_DONE: Student attendance already recorded for this meal session.",
            uid=clean_uid,
            student=student_name,
            date=date_str,
            time=time_str,
            meal=meal,
            today_counts=get_today_meal_counts(db, date_str)
        )

    # 1. Record in RFIDScan table
    scan = RFIDScan(
        uid=clean_uid,
        student_name=student_name,
        date=date_str,
        meal=meal,
        status="PRESENT",
        timestamp=now
    )
    db.add(scan)

    # 2. Update or create MealAttendance record for today
    att_row = db.query(MealAttendance).filter(
        MealAttendance.date == date_str,
        MealAttendance.meal_type == meal
    ).first()

    if att_row:
        att_row.actual_diners += 1
    else:
        # Create baseline row if not present
        expected_base = 320 if meal == "breakfast" else 440 if meal == "lunch" else 400
        portions = 0.25 if meal == "breakfast" else 0.40 if meal == "lunch" else 0.35
        att_row = MealAttendance(
            date=date_str,
            meal_type=meal,
            expected_diners=expected_base,
            actual_diners=1,
            cooked_kg=round(expected_base * portions * 1.08, 1),
            wasted_kg=0.0,
            notes="Live RFID Hardware Sync"
        )
        db.add(att_row)

    # 3. Notification & Cryptographic Audit Log
    db.add(Notification(
        target_role="hostel_admin",
        title=f"💳 RFID Attendance Recorded: {student_name}",
        message=f"{student_name} (UID: {clean_uid}) checked in for {meal.capitalize()} at {time_str}.",
        type="info"
    ))

    record_audit_entry(
        db,
        "RFID_ATTENDANCE",
        f"Card {clean_uid} ({student_name}) tapped at IoT Station for {meal}. Date: {date_str}.",
        actor_name="ESP32 RFID Reader"
    )

    db.commit()

    # Forward asynchronously to Google Sheets if configured
    background_tasks.add_task(forward_to_google_sheets, clean_uid)

    today_counts = get_today_meal_counts(db, date_str)

    return RFIDTapResponse(
        status="success",
        message="ATTENDANCE_RECORDED",
        uid=clean_uid,
        student=student_name,
        date=date_str,
        time=time_str,
        meal=meal,
        today_counts=today_counts
    )

def get_today_meal_counts(db: Session, date_str: str) -> dict:
    counts = {"breakfast": 0, "lunch": 0, "dinner": 0}
    for m in counts.keys():
        scans_count = db.query(RFIDScan).filter(
            RFIDScan.date == date_str,
            RFIDScan.meal == m,
            RFIDScan.status == "PRESENT"
        ).count()
        # Also check MealAttendance actual_diners
        att = db.query(MealAttendance).filter(
            MealAttendance.date == date_str,
            MealAttendance.meal_type == m
        ).first()
        counts[m] = max(scans_count, att.actual_diners if att else 0)
    return counts

@router.get("/attendance-logs", response_model=List[RFIDScanLogResponse])
def get_rfid_logs(db: Session = Depends(get_db)):
    logs = db.query(RFIDScan).order_by(RFIDScan.id.desc()).limit(50).all()
    return logs

@router.post("/food-records", response_model=FoodRecordResponse)
def save_food_record(payload: FoodRecordCreate, db: Session = Depends(get_db)):
    if payload.waste_kg > payload.quantity_kg:
        raise HTTPException(status_code=400, detail="Waste cannot exceed prepared quantity.")

    now = datetime.now()
    record = FoodRecord(
        food_name=payload.food_name,
        quantity_kg=payload.quantity_kg,
        waste_kg=payload.waste_kg,
        source=payload.source or "Dashboard",
        timestamp=now
    )
    db.add(record)

    # Also log to audit chain
    record_audit_entry(
        db,
        "FOOD_RECORD_SAVED",
        f"Logged {payload.food_name}: Prepared {payload.quantity_kg} kg, Waste {payload.waste_kg} kg.",
        actor_name="Kitchen Manager"
    )

    db.commit()
    db.refresh(record)
    return record

@router.get("/food-records", response_model=List[FoodRecordResponse])
def get_food_records(db: Session = Depends(get_db)):
    records = db.query(FoodRecord).order_by(FoodRecord.id.desc()).limit(50).all()
    return records

@router.get("/dashboard-summary")
def get_hardware_dashboard_summary(db: Session = Depends(get_db)):
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    today_counts = get_today_meal_counts(db, date_str)
    
    recent_scans = db.query(RFIDScan).order_by(RFIDScan.id.desc()).limit(20).all()
    recent_foods = db.query(FoodRecord).order_by(FoodRecord.id.desc()).limit(20).all()

    return {
        "status": "success",
        "date": date_str,
        "mess_status": "Open",
        "today_counts": today_counts,
        "recent_scans": [
            {
                "id": s.id,
                "uid": s.uid,
                "student": s.student_name,
                "meal": s.meal,
                "status": s.status,
                "timestamp": s.timestamp.strftime("%d %b %Y, %H:%M:%S")
            } for s in recent_scans
        ],
        "recent_foods": [
            {
                "id": f.id,
                "food": f.food_name,
                "quantity": f.quantity_kg,
                "waste": f.waste_kg,
                "source": f.source,
                "timestamp": f.timestamp.strftime("%d %b %Y, %H:%M:%S")
            } for f in recent_foods
        ]
    }
