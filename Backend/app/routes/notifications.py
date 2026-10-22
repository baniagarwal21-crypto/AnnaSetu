from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import Notification
from app.schemas import NotificationResponse

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=List[NotificationResponse])
def get_notifications(role: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Notification)
    if role and role != "all":
        query = query.filter(Notification.target_role.in_(["all", role]))
    notifs = query.order_by(Notification.created_at.desc()).limit(30).all()
    return notifs

@router.post("/mark-all-read")
def mark_all_notifications_read(role: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Notification).filter(Notification.is_read == False)
    if role and role != "all":
        query = query.filter(Notification.target_role.in_(["all", role]))
    notifs = query.all()
    for n in notifs:
        n.is_read = True
    db.commit()
    return {"status": "success", "marked_count": len(notifs)}
