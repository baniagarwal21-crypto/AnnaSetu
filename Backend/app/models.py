from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    role = Column(String(50), nullable=False, default="hostel_admin")  # hostel_admin, ngo_coordinator, driver, auditor
    organization = Column(String(150), nullable=True)
    phone = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    type = Column(String(50), nullable=False)  # hostel_mess, ngo, canteen, factory
    address = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    capacity_kg = Column(Float, default=100.0)
    contact_phone = Column(String(20), nullable=True)

    surplus_listings = relationship("SurplusListing", back_populates="location")
    claims = relationship("Claim", back_populates="ngo")

class MealAttendance(Base):
    __tablename__ = "meal_attendances"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String(10), index=True, nullable=False)  # YYYY-MM-DD
    meal_type = Column(String(20), nullable=False)  # breakfast, lunch, dinner
    expected_diners = Column(Integer, nullable=False)
    actual_diners = Column(Integer, nullable=False)
    cooked_kg = Column(Float, nullable=False)
    wasted_kg = Column(Float, default=0.0)
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class SurplusListing(Base):
    __tablename__ = "surplus_listings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    category = Column(String(100), nullable=False)  # Cooked rice and grains, Dairy and paneer gravies, Bakery items, Fresh produce
    quantity_kg = Column(Float, nullable=False)
    storage_temp_c = Column(Float, default=25.0)
    safe_window_hours = Column(Float, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    status = Column(String(50), default="available")  # available, claimed, picked_up, delivered, expired
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    location = relationship("Location", back_populates="surplus_listings")
    claims = relationship("Claim", back_populates="surplus")

class Claim(Base):
    __tablename__ = "claims"

    id = Column(Integer, primary_key=True, index=True)
    surplus_id = Column(Integer, ForeignKey("surplus_listings.id"), nullable=False)
    ngo_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    claimed_kg = Column(Float, nullable=False)
    otp_code = Column(String(10), nullable=False)
    status = Column(String(50), default="reserved")  # reserved, in_transit, completed, cancelled
    claimed_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    surplus = relationship("SurplusListing", back_populates="claims")
    ngo = relationship("Location", back_populates="claims")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(100), nullable=False)
    details = Column(Text, nullable=False)
    previous_hash = Column(String(64), nullable=False)
    entry_hash = Column(String(64), nullable=False)
    actor_name = Column(String(100), default="System")
    created_at = Column(DateTime, default=datetime.utcnow)

class IoTTelemetry(Base):
    __tablename__ = "iot_telemetry"

    id = Column(Integer, primary_key=True, index=True)
    unit_name = Column(String(100), nullable=False)
    unit_type = Column(String(50), nullable=False)  # cold_room, hot_hold, dry_store
    temperature_c = Column(Float, nullable=False)
    gas_ppm = Column(Float, nullable=False)
    status = Column(String(20), default="normal")  # normal, warning, critical
    updated_at = Column(DateTime, default=datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    target_role = Column(String(50), default="all")  # all, hostel_admin, ngo_coordinator, driver
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="info")  # surplus_new, claim_reserved, otp_verified, iot_alert, info
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class RFIDScan(Base):
    __tablename__ = "rfid_scans"

    id = Column(Integer, primary_key=True, index=True)
    uid = Column(String(50), index=True, nullable=False)
    student_name = Column(String(100), nullable=False)
    date = Column(String(10), index=True, nullable=False)  # YYYY-MM-DD
    meal = Column(String(20), nullable=False)  # breakfast, lunch, dinner
    status = Column(String(20), default="PRESENT")  # PRESENT, DUPLICATE, REJECTED
    timestamp = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

class FoodRecord(Base):
    __tablename__ = "food_records"

    id = Column(Integer, primary_key=True, index=True)
    food_name = Column(String(100), nullable=False)
    quantity_kg = Column(Float, nullable=False)
    waste_kg = Column(Float, nullable=False)
    source = Column(String(50), default="Hardware RFID Station")
    timestamp = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

class LiveDeliveryTracking(Base):
    __tablename__ = "live_delivery_tracking"

    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(Integer, ForeignKey("claims.id"), nullable=False)
    driver_name = Column(String(100), default="Amit Kumar")
    driver_phone = Column(String(20), default="+91 98220 77889")
    vehicle_type = Column(String(50), default="Rapid EV Van")
    current_lat = Column(Float, nullable=False)
    current_lng = Column(Float, nullable=False)
    pickup_lat = Column(Float, nullable=False)
    pickup_lng = Column(Float, nullable=False)
    target_lat = Column(Float, nullable=False)
    target_lng = Column(Float, nullable=False)
    status = Column(String(50), default="in_transit")  # heading_to_kitchen, picked_up, in_transit, arrived, completed
    speed_kmh = Column(Float, default=28.0)
    remaining_distance_km = Column(Float, default=4.2)
    eta_minutes = Column(Integer, default=9)
    progress_percent = Column(Float, default=35.0)
    route_waypoints_json = Column(Text, nullable=True)
    current_waypoint_index = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow)

    claim = relationship("Claim")
