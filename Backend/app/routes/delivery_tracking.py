import json
import math
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import LiveDeliveryTracking, Claim, Location, SurplusListing
from app.schemas import LiveDeliveryTrackingResponse, DeliveryStepRequest

router = APIRouter(prefix="/delivery", tags=["Live GPS Delivery Tracking (Zomato/Blinkit Style)"])

# Pre-computed realistic road corridor waypoints between KIET Campus and Robin Hood Army / Ghaziabad Shelters
DEFAULT_WAYPOINTS = [
    [28.7532, 77.4975], # KIET Mess Hub (Start)
    [28.7460, 77.4920], # Muradnagar Junction
    [28.7350, 77.4850], # NH-58 Tollway
    [28.7210, 77.4760], # Duhai Interchange
    [28.7080, 77.4680], # Guldhar Rapid Transit
    [28.6950, 77.4590], # Raj Nagar Extension Flyover
    [28.6830, 77.4520], # ALT Center Crossing
    [28.6750, 77.4480], # Raj Nagar Sector 10 Approach
    [28.6692, 77.4538]  # Robin Hood Army Shelter (Destination)
]

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0)**2
    return R * 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

def get_or_create_live_tracking(db: Session, claim: Claim) -> LiveDeliveryTracking:
    tracking = db.query(LiveDeliveryTracking).filter(LiveDeliveryTracking.claim_id == claim.id).first()
    if not tracking:
        kit_loc = claim.surplus.location if claim.surplus and claim.surplus.location else None
        ngo_loc = claim.ngo if claim.ngo else None

        pickup_lat = kit_loc.latitude if kit_loc else 28.7532
        pickup_lng = kit_loc.longitude if kit_loc else 77.4975
        target_lat = ngo_loc.latitude if ngo_loc else 28.6692
        target_lng = ngo_loc.longitude if ngo_loc else 77.4538

        # Create intermediate interpolated waypoints
        steps = 10
        waypoints = []
        for i in range(steps + 1):
            t = i / float(steps)
            lat = round(pickup_lat + (target_lat - pickup_lat) * t, 5)
            lng = round(pickup_lng + (target_lng - pickup_lng) * t, 5)
            waypoints.append([lat, lng])

        total_dist = haversine(pickup_lat, pickup_lng, target_lat, target_lng)
        eta_min = int(round((total_dist / 28.0) * 60.0))

        tracking = LiveDeliveryTracking(
            claim_id=claim.id,
            driver_name="Amit Kumar",
            driver_phone="+91 98220 77889",
            vehicle_type="Rapid EV Van (Eco-Route)",
            current_lat=pickup_lat,
            current_lng=pickup_lng,
            pickup_lat=pickup_lat,
            pickup_lng=pickup_lng,
            target_lat=target_lat,
            target_lng=target_lng,
            status="en_route" if claim.status != "completed" else "completed",
            speed_kmh=28.5,
            remaining_distance_km=round(total_dist, 1),
            eta_minutes=max(2, eta_min),
            progress_percent=15.0 if claim.status != "completed" else 100.0,
            route_waypoints_json=json.dumps(waypoints),
            current_waypoint_index=1,
            updated_at=datetime.utcnow()
        )
        db.add(tracking)
        db.commit()
        db.refresh(tracking)
    return tracking

def build_tracking_response(claim: Claim, tr: LiveDeliveryTracking) -> LiveDeliveryTrackingResponse:
    waypoints = json.loads(tr.route_waypoints_json or "[]")
    return LiveDeliveryTrackingResponse(
        id=tr.id,
        claim_id=tr.claim_id,
        driver_name=tr.driver_name,
        driver_phone=tr.driver_phone,
        vehicle_type=tr.vehicle_type,
        current_lat=tr.current_lat,
        current_lng=tr.current_lng,
        pickup_lat=tr.pickup_lat,
        pickup_lng=tr.pickup_lng,
        target_lat=tr.target_lat,
        target_lng=tr.target_lng,
        pickup_name=claim.surplus.location.name if claim.surplus and claim.surplus.location else "KIET Main Mess",
        destination_name=claim.ngo.name if claim.ngo else "Robin Hood Army Shelter",
        food_title=claim.surplus.title if claim.surplus else "Surplus Meal Batch",
        claimed_kg=claim.claimed_kg,
        status=tr.status,
        speed_kmh=tr.speed_kmh,
        remaining_distance_km=tr.remaining_distance_km,
        eta_minutes=tr.eta_minutes,
        progress_percent=tr.progress_percent,
        waypoints=waypoints,
        current_waypoint_index=tr.current_waypoint_index,
        otp_code=claim.otp_code,
        updated_at=tr.updated_at
    )

@router.get("/active", response_model=List[LiveDeliveryTrackingResponse])
def get_active_live_deliveries(db: Session = Depends(get_db)):
    """
    Returns all active deliveries currently en route with real-time GPS telemetry.
    Visible to both Hostel Administrators and NGO Coordinators (like Zomato/Blinkit).
    """
    claims = db.query(Claim).filter(Claim.status.in_(["reserved", "in_transit", "completed"])).all()
    results = []
    
    for c in claims:
        tr = get_or_create_live_tracking(db, c)
        results.append(build_tracking_response(c, tr))
        
    return results

@router.get("/live/{claim_id}", response_model=LiveDeliveryTrackingResponse)
def get_delivery_tracking_by_claim(claim_id: int, db: Session = Depends(get_db)):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    tr = get_or_create_live_tracking(db, claim)
    return build_tracking_response(claim, tr)

@router.post("/simulate-step", response_model=LiveDeliveryTrackingResponse)
def simulate_vehicle_movement(payload: DeliveryStepRequest, db: Session = Depends(get_db)):
    """
    Advances the delivery vehicle along the route in real time.
    Updates GPS coordinates, reduces remaining distance, decrements ETA countdown,
    and updates progress percentage like Zomato/Blinkit!
    """
    claim_id = payload.claim_id
    step_advance = payload.step_advance or 1
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    tr = get_or_create_live_tracking(db, claim)
    waypoints = json.loads(tr.route_waypoints_json or "[]")
    
    if not waypoints:
        return build_tracking_response(claim, tr)

    next_idx = tr.current_waypoint_index + step_advance
    total_points = len(waypoints)

    if next_idx >= total_points:
        # Reached destination!
        tr.current_waypoint_index = total_points - 1
        tr.current_lat = tr.target_lat
        tr.current_lng = tr.target_lng
        tr.status = "delivered"
        tr.remaining_distance_km = 0.0
        tr.eta_minutes = 0
        tr.progress_percent = 100.0
        tr.speed_kmh = 0.0
    else:
        # Move to next waypoint
        tr.current_waypoint_index = next_idx
        tr.current_lat = waypoints[next_idx][0]
        tr.current_lng = waypoints[next_idx][1]
        tr.status = "in_transit"
        
        # Calculate remaining
        rem_dist = haversine(tr.current_lat, tr.current_lng, tr.target_lat, tr.target_lng)
        tr.remaining_distance_km = round(rem_dist, 1)
        tr.eta_minutes = max(1, int(round((rem_dist / 28.0) * 60.0)))
        tr.progress_percent = round((next_idx / float(total_points - 1)) * 100.0, 1)
        tr.speed_kmh = round(26.0 + (next_idx % 3) * 2.5, 1)

    tr.updated_at = datetime.utcnow()
    db.commit()

    return build_tracking_response(claim, tr)

@router.post("/reset-simulation", response_model=LiveDeliveryTrackingResponse)
def reset_delivery_simulation(claim_id: int, db: Session = Depends(get_db)):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    tr = get_or_create_live_tracking(db, claim)
    waypoints = json.loads(tr.route_waypoints_json or "[]")
    
    if waypoints:
        tr.current_waypoint_index = 0
        tr.current_lat = waypoints[0][0]
        tr.current_lng = waypoints[0][1]
        tr.status = "in_transit"
        total_dist = haversine(tr.pickup_lat, tr.pickup_lng, tr.target_lat, tr.target_lng)
        tr.remaining_distance_km = round(total_dist, 1)
        tr.eta_minutes = max(2, int(round((total_dist / 28.0) * 60.0)))
        tr.progress_percent = 5.0
        tr.speed_kmh = 28.0
        tr.updated_at = datetime.utcnow()
        db.commit()

    return build_tracking_response(claim, tr)
