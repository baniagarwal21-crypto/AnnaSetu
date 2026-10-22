import random
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Claim, SurplusListing, Location, Notification
from app.schemas import ClaimCreate, ClaimResponse, OTPVerification
from app.services.audit_chain import record_audit_entry

router = APIRouter(prefix="/claims", tags=["Claims & OTP Verification"])

@router.get("/active", response_model=List[ClaimResponse])
def get_active_claims(db: Session = Depends(get_db)):
    claims = db.query(Claim).filter(Claim.status.in_(["reserved", "in_transit"])).all()
    results = []
    for c in claims:
        results.append(ClaimResponse(
            id=c.id,
            surplus_id=c.surplus_id,
            surplus_title=c.surplus.title,
            ngo_id=c.ngo_id,
            ngo_name=c.ngo.name,
            claimed_kg=c.claimed_kg,
            otp_code=c.otp_code,
            status=c.status,
            claimed_at=c.claimed_at,
            completed_at=c.completed_at
        ))
    return results

@router.post("", response_model=ClaimResponse)
def create_claim(payload: ClaimCreate, db: Session = Depends(get_db)):
    surplus = db.query(SurplusListing).filter(SurplusListing.id == payload.surplus_id).first()
    if not surplus:
        raise HTTPException(status_code=404, detail="Surplus listing not found.")
    if surplus.status != "available":
        raise HTTPException(status_code=400, detail=f"Surplus is already {surplus.status}.")

    ngo = db.query(Location).filter(Location.id == payload.ngo_id).first()
    if not ngo:
        raise HTTPException(status_code=404, detail="NGO organization not found.")

    claimed_kg = payload.claimed_kg if payload.claimed_kg and payload.claimed_kg > 0 else surplus.quantity_kg
    # Generate secure 6-digit OTP
    otp_code = f"{random.randint(100000, 999999)}"

    claim = Claim(
        surplus_id=surplus.id,
        ngo_id=ngo.id,
        claimed_kg=claimed_kg,
        otp_code=otp_code,
        status="reserved",
        claimed_at=datetime.utcnow()
    )
    surplus.status = "claimed"
    db.add(claim)
    db.commit()
    db.refresh(claim)

    # Cryptographic Audit Chain logging
    record_audit_entry(
        db,
        "FOOD_CLAIMED",
        f"{ngo.name} claimed {claimed_kg} kg of '{surplus.title}'. Verification OTP {otp_code} issued.",
        actor_name=ngo.name
    )

    # Notification to hostel admin & driver
    db.add(Notification(
        target_role="hostel_admin",
        title=f"🤝 Surplus Reserved: {ngo.name}",
        message=f"{ngo.name} reserved {claimed_kg} kg of {surplus.title}. Handoff code: {otp_code}.",
        type="claim_reserved"
    ))
    db.add(Notification(
        target_role="driver",
        title=f"🚚 New Pickup Job Added",
        message=f"Pickup {claimed_kg} kg at {surplus.location.name} for delivery to {ngo.name}.",
        type="claim_reserved"
    ))
    db.commit()

    return ClaimResponse(
        id=claim.id,
        surplus_id=surplus.id,
        surplus_title=surplus.title,
        ngo_id=ngo.id,
        ngo_name=ngo.name,
        claimed_kg=claim.claimed_kg,
        otp_code=claim.otp_code,
        status=claim.status,
        claimed_at=claim.claimed_at,
        completed_at=claim.completed_at
    )

@router.post("/verify-otp")
def verify_claim_otp(payload: OTPVerification, db: Session = Depends(get_db)):
    claim = db.query(Claim).filter(Claim.id == payload.claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim record not found.")

    if claim.status == "completed":
        return {"success": True, "message": "This delivery has already been verified and completed."}

    if claim.otp_code.strip() != payload.otp_code.strip():
        raise HTTPException(status_code=400, detail="Invalid OTP code. Please enter the correct 6-digit hand-off code.")

    # Successful verification
    claim.status = "completed"
    claim.completed_at = datetime.utcnow()
    if claim.surplus:
        claim.surplus.status = "delivered"
    db.commit()

    # Append to SHA-256 audit chain
    record_audit_entry(
        db,
        "HANDOFF_VERIFIED",
        f"Verified physical handoff of {claim.claimed_kg} kg to {claim.ngo.name} via OTP {claim.otp_code}.",
        actor_name="Delivery Driver"
    )

    # Notification
    db.add(Notification(
        target_role="all",
        title=f"🎉 Food Successfully Rescued!",
        message=f"{claim.claimed_kg} kg safely delivered to {claim.ngo.name}. Audit chain hash recorded.",
        type="otp_verified"
    ))
    db.commit()

    return {
        "success": True,
        "message": f"Successfully verified hand-off! {claim.claimed_kg} kg delivered to {claim.ngo.name}.",
        "claim_id": claim.id,
        "claimed_kg": claim.claimed_kg,
        "completed_at": claim.completed_at.isoformat()
    }
