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
from shared.models import Employee, LeaveRequest, User
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
class EmployeeCreate(BaseModel):
    user_id: int
    full_name: str
    job_title: str
    phone_number: str | None = None
    address: str | None = None
    salary: float
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None

class EmployeeOut(BaseModel):
    id: int
    user_id: int
    full_name: str
    job_title: str
    phone_number: str | None = None
    address: str | None = None
    hire_date: datetime
    salary: float
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    class Config: orm_mode = True

class LeaveRequestCreate(BaseModel):
    start_date: datetime
    end_date: datetime
    reason: str

class LeaveRequestOut(BaseModel):
    id: int
    employee_id: int
    start_date: datetime
    end_date: datetime
    reason: str
    status: str
    class Config: orm_mode = True

# --- API Endpoints ---
@app.get("/")
def read_root():
    return {"service": "HR Service", "status": "running"}

@app.post("/employees/", response_model=EmployeeOut, status_code=status.HTTP_201_CREATED)
def create_employee_profile(
    employee: EmployeeCreate,
    db: Session = Depends(get_db),
    token: TokenPayload = Depends(get_current_user_payload),
):
    if token.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create employee profiles.")

    db_user = db.query(User).filter(User.id == employee.user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found.")

    db_employee = Employee(**employee.dict())
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)
    return db_employee

@app.post("/leave-requests/", response_model=LeaveRequestOut, status_code=status.HTTP_201_CREATED)
def create_leave_request(
    request: LeaveRequestCreate,
    db: Session = Depends(get_db),
    token: TokenPayload = Depends(get_current_user_payload),
):
    user = db.query(User).filter(User.username == token.sub).first()
    if not user or not user.employee_profile:
        raise HTTPException(status_code=404, detail="Employee profile not found for current user.")

    new_request = LeaveRequest(**request.dict(), employee_id=user.employee_profile.id)
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    return new_request

@app.get("/leave-requests/", response_model=List[LeaveRequestOut])
def get_all_leave_requests(
    db: Session = Depends(get_db),
    token: TokenPayload = Depends(get_current_user_payload),
):
    if token.role != "admin": # In a real app, might also be 'hr_manager'
        raise HTTPException(status_code=403, detail="Not authorized to view all leave requests.")

    return db.query(LeaveRequest).all()

@app.put("/leave-requests/{request_id}/status", response_model=LeaveRequestOut)
def update_leave_request_status(
    request_id: int,
    new_status: str, # "approved" or "rejected"
    db: Session = Depends(get_db),
    token: TokenPayload = Depends(get_current_user_payload),
):
    if token.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can approve or reject leave requests.")

    db_request = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not db_request:
        raise HTTPException(status_code=404, detail="Leave request not found.")

    db_request.status = new_status
    db.commit()
    db.refresh(db_request)
    return db_request

@app.get("/employees/me", response_model=EmployeeOut)
def get_my_employee_profile(
    db: Session = Depends(get_db),
    token: TokenPayload = Depends(get_current_user_payload),
):
    user = db.query(User).filter(User.username == token.sub).first()
    if not user or not user.employee_profile:
        raise HTTPException(status_code=404, detail="Employee profile not found for current user.")
    return user.employee_profile

@app.get("/leave-requests/me", response_model=List[LeaveRequestOut])
def get_my_leave_requests(
    db: Session = Depends(get_db),
    token: TokenPayload = Depends(get_current_user_payload),
):
    user = db.query(User).filter(User.username == token.sub).first()
    if not user or not user.employee_profile:
        raise HTTPException(status_code=404, detail="Employee profile not found for current user.")

    return user.employee_profile.leave_requests

@app.put("/employees/{employee_id}", response_model=EmployeeOut)
def update_employee_profile(
    employee_id: int,
    employee_update: EmployeeCreate, # Re-using create schema for full updates
    db: Session = Depends(get_db),
    token: TokenPayload = Depends(get_current_user_payload),
):
    if token.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update employee profiles.")

    db_employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not db_employee:
        raise HTTPException(status_code=404, detail="Employee not found.")

    # Update fields
    for key, value in employee_update.dict().items():
        setattr(db_employee, key, value)

    db.commit()
    db.refresh(db_employee)
    return db_employee
