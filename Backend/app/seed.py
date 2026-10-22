from datetime import datetime, timedelta
import random
from sqlalchemy.orm import Session
from app.models import (
    User, Location, MealAttendance, SurplusListing, Claim,
    AuditLog, IoTTelemetry, Notification
)
from app.services.shelf_life import calculate_safe_window
from app.services.audit_chain import record_audit_entry

def seed_initial_data(db: Session):
    # Check if data already exists
    if db.query(Location).first():
        return

    print("[INFO] Seeding initial demonstration data for AnnaSetu platform...")

    # 1. Locations
    locations = [
        Location(
            name="KIET Main Mess (Central Kitchen)",
            type="hostel_mess",
            address="KIET Group of Institutions, Delhi-NCR, Ghaziabad",
            latitude=28.7532,
            longitude=77.4975,
            capacity_kg=500.0,
            contact_phone="+91 98110 12345"
        ),
        Location(
            name="Aryabhatta Boys Hostel Canteen",
            type="hostel_mess",
            address="Block B Campus, KIET Ghaziabad",
            latitude=28.7510,
            longitude=77.4950,
            capacity_kg=250.0,
            contact_phone="+91 98110 54321"
        ),
        Location(
            name="Robin Hood Army Ghaziabad Chapter",
            type="ngo",
            address="Raj Nagar Sector 10, Ghaziabad",
            latitude=28.6692,
            longitude=77.4538,
            capacity_kg=120.0,
            contact_phone="+91 98711 22334"
        ),
        Location(
            name="Feeding Hope Community Shelter",
            type="ngo",
            address="Kavi Nagar D-Block, Ghaziabad",
            latitude=28.6986,
            longitude=77.4211,
            capacity_kg=90.0,
            contact_phone="+91 98990 33445"
        ),
        Location(
            name="Seva Food Bank & Night Shelter",
            type="ngo",
            address="Old Bus Stand Road, Ghaziabad",
            latitude=28.7041,
            longitude=77.4325,
            capacity_kg=300.0,
            contact_phone="+91 98101 44556"
        ),
        Location(
            name="Asha Bal Sahara Home",
            type="ngo",
            address="Govindpuram Main Road, Ghaziabad",
            latitude=28.6850,
            longitude=77.5120,
            capacity_kg=60.0,
            contact_phone="+91 98112 55667"
        )
    ]
    db.add_all(locations)
    db.commit()

    # 2. Users
    users = [
        User(name="Ramesh Sharma", email="ramesh.admin@kiet.edu", role="hostel_admin", organization="KIET Mess Management", phone="+91 98110 12345"),
        User(name="Pooja Verma", email="pooja@robinhoodarmy.org", role="ngo_coordinator", organization="Robin Hood Army", phone="+91 98711 22334"),
        User(name="Amit Kumar", email="amit.driver@annasetu.org", role="driver", organization="AnnaSetu Rapid Logistics", phone="+91 98220 77889"),
        User(name="Dr. Sunita Rao", email="sunita.esg@auditor.in", role="auditor", organization="National Sustainability Council", phone="+91 99330 11223"),
    ]
    db.add_all(users)
    db.commit()

    # 3. 14 Days of Historical Attendance & Waste Data
    now = datetime.utcnow()
    attendances = []
    base_diners = {"breakfast": 310, "lunch": 435, "dinner": 395}
    portions = {"breakfast": 0.25, "lunch": 0.40, "dinner": 0.35}

    for i in range(14, 0, -1):
        dt = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        for meal in ["breakfast", "lunch", "dinner"]:
            expected = base_diners[meal] + random.randint(-25, 25)
            # Actual turnout slight variation
            actual = int(expected * random.uniform(0.92, 1.04))
            cooked = round(expected * portions[meal] * 1.08, 1)
            consumed = round(actual * portions[meal], 1)
            wasted = max(0.0, round(cooked - consumed, 1))
            attendances.append(MealAttendance(
                date=dt,
                meal_type=meal,
                expected_diners=expected,
                actual_diners=actual,
                cooked_kg=cooked,
                wasted_kg=wasted,
                notes="Standard mess schedule"
            ))
    db.add_all(attendances)
    db.commit()

    # 4. IoT Storage Units
    iot_units = [
        IoTTelemetry(unit_name="Hostel Cold Storage Room A", unit_type="cold_room", temperature_c=3.4, gas_ppm=135.0, status="normal"),
        IoTTelemetry(unit_name="Kitchen Hot-Hold Serving Counter", unit_type="hot_hold", temperature_c=66.2, gas_ppm=92.0, status="normal"),
        IoTTelemetry(unit_name="Dry Grain & Bakery Store", unit_type="dry_store", temperature_c=25.1, gas_ppm=108.0, status="normal"),
    ]
    db.add_all(iot_units)
    db.commit()

    # 5. Surplus Listings
    # Active surplus batch ready to claim
    surplus_items = [
        SurplusListing(
            title="Fresh Paneer Pulao & Dal Makhani",
            category="Dairy and paneer gravies",
            quantity_kg=40.0,
            storage_temp_c=30.0,
            safe_window_hours=calculate_safe_window("Dairy and paneer gravies", 30.0),
            expires_at=now + timedelta(hours=3.5),
            location_id=1,
            status="available",
            notes="Prepared for hostel lunch. Kept hot in insulated food grade containers."
        ),
        SurplusListing(
            title="Whole Wheat Roti & Mixed Veg Gravy",
            category="Cooked rice and grains",
            quantity_kg=25.0,
            storage_temp_c=28.0,
            safe_window_hours=calculate_safe_window("Cooked rice and grains", 28.0),
            expires_at=now + timedelta(hours=4.8),
            location_id=1,
            status="available",
            notes="Freshly packed in sanitized 5kg bins."
        ),
        SurplusListing(
            title="Breakfast Vegetable Poha & Sandwiches",
            category="Bakery items",
            quantity_kg=35.0,
            storage_temp_c=22.0,
            safe_window_hours=calculate_safe_window("Bakery items", 22.0),
            expires_at=now + timedelta(hours=14.0),
            location_id=2,
            status="claimed",
            notes="Surplus from morning canteen."
        )
    ]
    db.add_all(surplus_items)
    db.commit()

    # 6. Active Claim for the claimed item with 6-digit OTP
    claimed_item = surplus_items[2]
    rha_ngo = locations[2]  # Robin Hood Army
    claim = Claim(
        surplus_id=claimed_item.id,
        ngo_id=rha_ngo.id,
        claimed_kg=35.0,
        otp_code="482913",
        status="reserved",
        claimed_at=now - timedelta(minutes=45)
    )
    db.add(claim)
    db.commit()

    # 7. Initial Cryptographic Audit Log Entries
    record_audit_entry(db, "SYSTEM_INITIALIZED", "AnnaSetu Genesis block initialized with PostgreSQL/SQLite persistence engine.", "System")
    record_audit_entry(db, "SURPLUS_POSTED", "KIET Main Mess posted 40.0 kg of 'Fresh Paneer Pulao & Dal Makhani'.", "Ramesh Sharma")
    record_audit_entry(db, "SURPLUS_CLAIMED", "Robin Hood Army claimed 35.0 kg of 'Breakfast Vegetable Poha & Sandwiches'. One-Time Code: 482913 generated.", "Pooja Verma")

    # 8. Notifications
    notifs = [
        Notification(
            target_role="all",
            title="✨ Welcome to AnnaSetu Platform",
            message="Zero food waste operations active. Live IoT sensors and AI turnout forecasting online.",
            type="info"
        ),
        Notification(
            target_role="ngo_coordinator",
            title="🍲 New Surplus Alert: 40 kg Paneer Pulao",
            message="KIET Main Mess has posted 40 kg available for immediate rescue. Safe window: ~3.5 hours.",
            type="surplus_new"
        ),
        Notification(
            target_role="hostel_admin",
            title="✅ Claim Confirmed: 35 kg Bakery Items",
            message="Robin Hood Army has reserved 35 kg. Assigned handoff verification code 482913.",
            type="claim_reserved"
        )
    ]
    db.add_all(notifs)
    db.commit()

    print("[SUCCESS] Demonstration data seeded successfully!")
