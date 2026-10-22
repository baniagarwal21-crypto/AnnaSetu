import math
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models import Claim, SurplusListing, Location

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    # Earth radius in km
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def get_optimized_route(db: Session, vehicle_capacity_kg: float = 150.0) -> Dict[str, Any]:
    # Depot location (Central Kitchen / Hostel Hub)
    depot = {
        "name": "Anna-Setu Central Logistics Hub",
        "address": "KIET Hostel Campus, Ghaziabad",
        "latitude": 28.7532,
        "longitude": 77.4975
    }

    # Fetch active reserved or in-transit claims
    active_claims = db.query(Claim).filter(Claim.status.in_(["reserved", "in_transit"])).all()
    if not active_claims:
        return {
            "total_km": 0.0,
            "total_minutes": 0.0,
            "distance_savings_percent": 0.0,
            "vehicle_capacity_kg": vehicle_capacity_kg,
            "stops": []
        }

    # Build jobs
    jobs = []
    baseline_unoptimized_km = 0.0
    avg_speed_kmh = 28.0

    for c in active_claims:
        surplus = c.surplus
        ngo = c.ngo
        kit_loc = surplus.location

        dist_depot_kit = haversine_distance(depot["latitude"], depot["longitude"], kit_loc.latitude, kit_loc.longitude)
        dist_kit_ngo = haversine_distance(kit_loc.latitude, kit_loc.longitude, ngo.latitude, ngo.longitude)
        dist_ngo_depot = haversine_distance(ngo.latitude, ngo.longitude, depot["latitude"], depot["longitude"])
        baseline_unoptimized_km += (dist_depot_kit + dist_kit_ngo + dist_ngo_depot)

        # remaining safe minutes
        rem_min = int(surplus.safe_window_hours * 60)

        jobs.append({
            "claim_id": c.id,
            "otp_code": c.otp_code,
            "kg": c.claimed_kg,
            "category": surplus.category,
            "pickup": {
                "name": kit_loc.name,
                "address": kit_loc.address,
                "lat": kit_loc.latitude,
                "lon": kit_loc.longitude
            },
            "delivery": {
                "name": ngo.name,
                "address": ngo.address,
                "lat": ngo.latitude,
                "lon": ngo.longitude
            },
            "deadline_min": rem_min,
            "picked": False,
            "delivered": False
        })

    # Greedy insertion TSP heuristic respecting pickup before delivery and vehicle capacity
    current_lat = depot["latitude"]
    current_lon = depot["longitude"]
    current_load = 0.0
    current_time_min = 0.0
    total_km = 0.0
    stops = []
    stop_count = 1

    remaining_steps = len(jobs) * 2
    for _ in range(remaining_steps):
        best_candidate = None
        best_score = float("inf")

        for job in jobs:
            if not job["delivered"]:
                # Can we pick up?
                if not job["picked"] and (current_load + job["kg"] <= vehicle_capacity_kg):
                    d = haversine_distance(current_lat, current_lon, job["pickup"]["lat"], job["pickup"]["lon"])
                    score = d + (job["deadline_min"] - current_time_min) * 0.05
                    if score < best_score:
                        best_score = score
                        best_candidate = ("pickup", job, d)
                
                # Can we deliver?
                elif job["picked"]:
                    d = haversine_distance(current_lat, current_lon, job["delivery"]["lat"], job["delivery"]["lon"])
                    score = d + (job["deadline_min"] - current_time_min) * 0.05
                    if score < best_score:
                        best_score = score
                        best_candidate = ("delivery", job, d)

        if not best_candidate:
            break

        action_type, job, step_dist = best_candidate
        travel_min = (step_dist / avg_speed_kmh) * 60.0
        current_time_min += travel_min + 5.0  # 5 min handling
        total_km += step_dist

        if action_type == "pickup":
            job["picked"] = True
            current_load += job["kg"]
            current_lat = job["pickup"]["lat"]
            current_lon = job["pickup"]["lon"]
            stops.append({
                "stop_number": stop_count,
                "type": "pickup",
                "location_name": job["pickup"]["name"],
                "address": job["pickup"]["address"],
                "latitude": job["pickup"]["lat"],
                "longitude": job["pickup"]["lon"],
                "kg": job["kg"],
                "category": job["category"],
                "eta_minutes": int(round(current_time_min)),
                "otp_code": None,
                "claim_id": job["claim_id"],
                "is_late": False
            })
        else:
            job["delivered"] = True
            current_load -= job["kg"]
            current_lat = job["delivery"]["lat"]
            current_lon = job["delivery"]["lon"]
            is_late = current_time_min > job["deadline_min"]
            stops.append({
                "stop_number": stop_count,
                "type": "delivery",
                "location_name": job["delivery"]["name"],
                "address": job["delivery"]["address"],
                "latitude": job["delivery"]["lat"],
                "longitude": job["delivery"]["lon"],
                "kg": job["kg"],
                "category": job["category"],
                "eta_minutes": int(round(current_time_min)),
                "otp_code": job["otp_code"],
                "claim_id": job["claim_id"],
                "is_late": is_late
            })

        stop_count += 1

    # Return to depot distance
    dist_back = haversine_distance(current_lat, current_lon, depot["latitude"], depot["longitude"])
    total_km += dist_back
    current_time_min += (dist_back / avg_speed_kmh) * 60.0

    savings = 0.0
    if baseline_unoptimized_km > 0:
        savings = max(0.0, round(((baseline_unoptimized_km - total_km) / baseline_unoptimized_km) * 100.0, 1))

    return {
        "total_km": round(total_km, 1),
        "total_minutes": round(current_time_min, 0),
        "distance_savings_percent": savings,
        "vehicle_capacity_kg": vehicle_capacity_kg,
        "stops": stops
    }
