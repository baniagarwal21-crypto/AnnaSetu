from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import OptimizedRouteResponse
from app.services.route_optimizer import get_optimized_route

router = APIRouter(prefix="/routes", tags=["Route Optimization"])

@router.get("/optimize", response_model=OptimizedRouteResponse)
def get_driver_optimized_route(capacity_kg: float = 150.0, db: Session = Depends(get_db)):
    result = get_optimized_route(db, vehicle_capacity_kg=capacity_kg)
    return result
