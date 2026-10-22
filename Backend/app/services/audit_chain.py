import hashlib
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import AuditLog

def compute_hash(prev_hash: str, action: str, details: str, timestamp_str: str) -> str:
    payload = f"{prev_hash}|{action}|{details}|{timestamp_str}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]

def record_audit_entry(db: Session, action: str, details: str, actor_name: str = "System") -> AuditLog:
    # Get latest entry to link
    last_log = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
    prev_hash = last_log.entry_hash if last_log else "0000000000000000"
    
    now = datetime.utcnow()
    entry_hash = compute_hash(prev_hash, action, details, now.isoformat())
    
    log_entry = AuditLog(
        action=action,
        details=details,
        previous_hash=prev_hash,
        entry_hash=entry_hash,
        actor_name=actor_name,
        created_at=now
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry
