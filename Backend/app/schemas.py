from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# Forecast Schemas
class DateInput(BaseModel):
    date: str = Field(..., example="2026-10-21")

class MealPrediction(BaseModel):
    expected_students: int
    recommended_cook_kg: float
    lower_range: Optional[int] = None
    upper_range: Optional[int] = None

class ForecastResponse(BaseModel):
    date: str
    day_name: Optional[str] = None
    holiday_info: Optional[str] = None
    mess_status: Optional[str] = "Open"
    is_closed: bool = False
    predictions: Dict[str, MealPrediction]
    model_version: str

# Surplus Schemas
class SurplusCreate(BaseModel):
    title: str = Field(..., example="Paneer Butter Masala & Pulao")
    category: str = Field(..., example="Dairy and paneer gravies")
    quantity_kg: float = Field(..., gt=0, example=35.0)
    storage_temp_c: float = Field(default=28.0, example=28.0)
    location_id: Optional[int] = Field(default=1)
    notes: Optional[str] = None

class SurplusResponse(BaseModel):
    id: int
    title: str
    category: str
    quantity_kg: float
    storage_temp_c: float
    safe_window_hours: float
    remaining_hours: float
    urgency: str  # critical, moderate, comfortable
    expires_at: datetime
    location_id: int
    location_name: Optional[str] = None
    status: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Ranked NGO
class RankedNGO(BaseModel):
    ngo_id: int
    name: str
    address: str
    distance_km: float
    drive_minutes: float
    capacity_kg: float
    is_eligible: bool
    suitability_score: float
    phone: Optional[str] = None

# Claim & OTP
class ClaimCreate(BaseModel):
    surplus_id: int
    ngo_id: int
    claimed_kg: Optional[float] = None

class ClaimResponse(BaseModel):
    id: int
    surplus_id: int
    surplus_title: str
    ngo_id: int
    ngo_name: str
    claimed_kg: float
    otp_code: str
    status: str
    claimed_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class OTPVerification(BaseModel):
    claim_id: int
    otp_code: str

# Audit Log
class AuditLogResponse(BaseModel):
    id: int
    action: str
    details: str
    previous_hash: str
    entry_hash: str
    actor_name: str
    created_at: datetime

    class Config:
        from_attributes = True

# IoT Telemetry
class IoTUnitResponse(BaseModel):
    id: int
    unit_name: str
    unit_type: str
    temperature_c: float
    gas_ppm: float
    status: str  # normal, warning, critical
    updated_at: datetime

    class Config:
        from_attributes = True

class IoTSimulateRequest(BaseModel):
    unit_id: int
    temperature_c: Optional[float] = None
    gas_ppm: Optional[float] = None
    simulate_spike: Optional[bool] = False

# Analytics Overview
class AnalyticsOverview(BaseModel):
    total_food_rescued_kg: float
    total_meals_provided: int
    total_co2e_avoided_kg: float
    total_value_recovered_inr: float
    percent_surplus_redistributed: float
    active_surplus_count: int
    active_claims_count: int
    category_breakdown: Dict[str, float]
    recent_14_day_waste_trend: List[Dict[str, Any]]

# Notification
class NotificationResponse(BaseModel):
    id: int
    target_role: str
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Route Stop
class RouteStop(BaseModel):
    stop_number: int
    type: str  # pickup, delivery
    location_name: str
    address: str
    latitude: float
    longitude: float
    kg: float
    category: str
    eta_minutes: int
    otp_code: Optional[str] = None
    claim_id: Optional[int] = None
    is_late: bool = False

class OptimizedRouteResponse(BaseModel):
    total_km: float
    total_minutes: float
    distance_savings_percent: float
    vehicle_capacity_kg: float
    stops: List[RouteStop]

# Hardware RFID & Attendance Schemas
class RFIDTapRequest(BaseModel):
    key: str = Field(default="dhruv", example="dhruv")
    uid: str = Field(..., example="1E6B7E05")
    meal_override: Optional[str] = Field(default=None, example="lunch")

class RFIDTapResponse(BaseModel):
    status: str
    message: str
    uid: str
    student: str
    date: str
    time: str
    meal: str
    today_counts: Dict[str, int]

class RFIDScanLogResponse(BaseModel):
    id: int
    uid: str
    student_name: str
    date: str
    meal: str
    status: str
    timestamp: datetime

    class Config:
        from_attributes = True

# Food Record Schemas
class FoodRecordCreate(BaseModel):
    food_name: str = Field(..., example="Steamed Rice & Dal")
    quantity_kg: float = Field(..., gt=0, example=45.0)
    waste_kg: float = Field(..., ge=0, example=4.5)
    source: Optional[str] = Field(default="Hardware RFID Station", example="Hardware RFID Station")

class FoodRecordResponse(BaseModel):
    id: int
    food_name: str
    quantity_kg: float
    waste_kg: float
    source: str
    timestamp: datetime

    class Config:
        from_attributes = True

# Live GPS Delivery Tracking Schemas (Zomato/Blinkit Style)
class DeliveryStepRequest(BaseModel):
    claim_id: int
    step_advance: Optional[int] = 1

class LiveDeliveryTrackingResponse(BaseModel):
    id: int
    claim_id: int
    driver_name: str
    driver_phone: str
    vehicle_type: str
    current_lat: float
    current_lng: float
    pickup_lat: float
    pickup_lng: float
    target_lat: float
    target_lng: float
    pickup_name: str
    destination_name: str
    food_title: str
    claimed_kg: float
    status: str
    speed_kmh: float
    remaining_distance_km: float
    eta_minutes: int
    progress_percent: float
    waypoints: List[List[float]]
    current_waypoint_index: int
    otp_code: str
    updated_at: datetime

# Prediction vs Actual Comparison Schema
class PredictionVsActualItem(BaseModel):
    date: str
    meal: str
    actual_diners: int
    predicted_diners: int
    error_count: int
    error_percentage: float
    cooked_kg: float
    wasted_kg: float

