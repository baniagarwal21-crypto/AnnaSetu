from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List
from app.database import get_db
from app.models import SurplusListing, Location, Notification
from app.schemas import SurplusCreate, SurplusResponse, RankedNGO
from app.services.shelf_life import calculate_safe_window, get_urgency_status
from app.services.audit_chain import record_audit_entry
from app.services.route_optimizer import haversine_distance

router = APIRouter(prefix="/surplus", tags=["Surplus Food Management"])

@router.get("", response_model=List[SurplusResponse])
def get_surplus_listings(status: str = None, db: Session = Depends(get_db)):
    query = db.query(SurplusListing)
    if status:
        query = query.filter(SurplusListing.status == status)
    listings = query.order_by(SurplusListing.created_at.desc()).all()

    now = datetime.utcnow()
    results = []
    for s in listings:
        rem_seconds = (s.expires_at - now).total_seconds()
        rem_hours = max(0.0, round(rem_seconds / 3600.0, 1))
        urgency, _ = get_urgency_status(rem_hours)
        
        # Check if expired
        if rem_hours == 0.0 and s.status == "available":
            s.status = "expired"
            db.commit()

        results.append(SurplusResponse(
            id=s.id,
            title=s.title,
            category=s.category,
            quantity_kg=s.quantity_kg,
            storage_temp_c=s.storage_temp_c,
            safe_window_hours=s.safe_window_hours,
            remaining_hours=rem_hours,
            urgency=urgency,
            expires_at=s.expires_at,
            location_id=s.location_id,
            location_name=s.location.name if s.location else "Unknown Mess",
            status=s.status,
            notes=s.notes,
            created_at=s.created_at
        ))
    return results

@router.post("", response_model=SurplusResponse)
def post_surplus_food(payload: SurplusCreate, db: Session = Depends(get_db)):
    location = db.query(Location).filter(Location.id == payload.location_id).first()
    if not location:
        # Fall back to first mess location
        location = db.query(Location).filter(Location.type == "hostel_mess").first()
        if not location:
            raise HTTPException(status_code=404, detail="Hostel location not found.")

    safe_h = calculate_safe_window(payload.category, payload.storage_temp_c)
    now = datetime.utcnow()
    expires_at = now + timedelta(hours=safe_h)

    new_surplus = SurplusListing(
        title=payload.title,
        category=payload.category,
        quantity_kg=payload.quantity_kg,
        storage_temp_c=payload.storage_temp_c,
        safe_window_hours=safe_h,
        expires_at=expires_at,
        location_id=location.id,
        status="available",
        notes=payload.notes,
        created_at=now
    )
    db.add(new_surplus)
    db.commit()
    db.refresh(new_surplus)

    # Cryptographic Audit Chain logging
    record_audit_entry(
        db,
        "SURPLUS_POSTED",
        f"{location.name} posted {payload.quantity_kg} kg of '{payload.title}' ({payload.category}) at {payload.storage_temp_c}°C. Safe window: {safe_h}h.",
        actor_name=location.name
    )

    # Broadcast notification to registered NGOs
    notif = Notification(
        target_role="ngo_coordinator",
        title=f"🍲 New Surplus Alert: {payload.quantity_kg} kg {payload.title}",
        message=f"{location.name} has posted {payload.quantity_kg} kg available for claim. Safe consumption window: {safe_h} hours.",
        type="surplus_new"
    )
    db.add(notif)
    db.commit()

    urgency, _ = get_urgency_status(safe_h)

    return SurplusResponse(
        id=new_surplus.id,
        title=new_surplus.title,
        category=new_surplus.category,
        quantity_kg=new_surplus.quantity_kg,
        storage_temp_c=new_surplus.storage_temp_c,
        safe_window_hours=new_surplus.safe_window_hours,
        remaining_hours=safe_h,
        urgency=urgency,
        expires_at=new_surplus.expires_at,
        location_id=new_surplus.location_id,
        location_name=location.name,
        status=new_surplus.status,
        notes=new_surplus.notes,
        created_at=new_surplus.created_at
    )

@router.get("/ranked-ngos/{surplus_id}", response_model=List[RankedNGO])
def rank_ngos_for_surplus(surplus_id: int, db: Session = Depends(get_db)):
    surplus = db.query(SurplusListing).filter(SurplusListing.id == surplus_id).first()
    if not surplus:
        raise HTTPException(status_code=404, detail="Surplus listing not found.")

    kit_loc = surplus.location
    ngos = db.query(Location).filter(Location.type == "ngo").all()

    now = datetime.utcnow()
    rem_min = max(0.0, (surplus.expires_at - now).total_seconds() / 60.0)

    ranked = []
    for ngo in ngos:
        dist_km = haversine_distance(kit_loc.latitude, kit_loc.longitude, ngo.latitude, ngo.longitude)
        drive_mins = (dist_km / 25.0) * 60.0  # Assumes city speed of 25 km/h
        
        # Eligibility criteria: drive time must be less than remaining safe window, and NGO capacity >= 15 kg
        is_eligible = (drive_mins < rem_min) and (ngo.capacity_kg >= min(surplus.quantity_kg, 15.0))
        
        # Multi-factor Suitability Score (0 to 1)
        # 40% distance proximity, 30% capacity coverage, 30% safe window buffer
        if is_eligible and rem_min > 0:
            dist_score = max(0.0, 1.0 - (dist_km / 15.0))
            cap_score = min(1.0, ngo.capacity_kg / max(1.0, surplus.quantity_kg))
            time_score = min(1.0, (rem_min - drive_mins) / rem_min)
            score = round(0.4 * dist_score + 0.3 * cap_score + 0.3 * time_score, 3)
        else:
            score = 0.0

        ranked.append(RankedNGO(
            ngo_id=ngo.id,
            name=ngo.name,
            address=ngo.address,
            distance_km=round(dist_km, 1),
            drive_minutes=round(drive_mins, 0),
            capacity_kg=ngo.capacity_kg,
            is_eligible=is_eligible,
            suitability_score=score,
            phone=ngo.contact_phone
        ))

    # Sort descending by suitability score
    ranked.sort(key=lambda x: x.suitability_score, reverse=True)
    return ranked
