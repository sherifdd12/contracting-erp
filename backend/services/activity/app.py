import os
import sys
from typing import List
from datetime import datetime

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

# Add parent directory to path to import shared modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from shared.database import get_db
from shared.models import ActivityLog, User
from shared.security import get_current_user_payload, TokenPayload

# --- FastAPI App ---
app = FastAPI()

# --- CORS Middleware ---
origins = ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Schemas ---
class ActivityLogCreate(BaseModel):
    action: str
    details: str | None = None

class ActivityLogOut(BaseModel):
    id: int
    user_id: int
    action: str
    details: str | None = None
    timestamp: datetime
    class Config: orm_mode = True

# --- API Endpoints ---
@app.get("/")
def read_root():
    return {"service": "Activity Service", "status": "running"}

@app.post("/activities/", response_model=ActivityLogOut, status_code=status.HTTP_201_CREATED)
def log_activity(
    activity: ActivityLogCreate,
    db: Session = Depends(get_db),
    token: TokenPayload = Depends(get_current_user_payload), # The user who performed the action
):
    user = db.query(User).filter(User.username == token.sub).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    new_log = ActivityLog(
        user_id=user.id,
        action=activity.action,
        details=activity.details
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    return new_log

@app.get("/activities/", response_model=List[ActivityLogOut])
def get_activity_logs(
    db: Session = Depends(get_db),
    token: TokenPayload = Depends(get_current_user_payload),
    limit: int = 100,
):
    if token.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to view activity logs.")

    logs = db.query(ActivityLog).order_by(ActivityLog.timestamp.desc()).limit(limit).all()
    return logs
