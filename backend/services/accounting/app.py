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
from shared.models import Invoice, Project
from shared.security import get_current_user_payload, TokenPayload

# --- FastAPI App ---
app = FastAPI()

# --- CORS Middleware ---
origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Schemas ---
class InvoiceCreate(BaseModel):
    amount: float
    project_id: int
    due_date: datetime | None = None

class InvoiceOut(BaseModel):
    id: int
    amount: float
    status: str
    due_date: datetime | None = None
    project_id: int

    class Config:
        orm_mode = True

# --- API Endpoints ---
@app.get("/")
def read_root():
    return {"service": "Accounting Service", "status": "running"}

@app.post("/invoices/", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED)
def create_invoice(
    invoice: InvoiceCreate,
    db: Session = Depends(get_db),
    token_payload: TokenPayload = Depends(get_current_user_payload),
):
    # Authorization check: only accountants or admins can create invoices
    if token_payload.role not in ["accountant", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to create invoices.",
        )

    # Check if project exists
    project = db.query(Project).filter(Project.id == invoice.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    new_invoice = Invoice(**invoice.dict(), status="pending")
    db.add(new_invoice)
    db.commit()
    db.refresh(new_invoice)
    return new_invoice

@app.get("/invoices/project/{project_id}", response_model=List[InvoiceOut])
def get_invoices_for_project(
    project_id: int,
    db: Session = Depends(get_db),
    token_payload: TokenPayload = Depends(get_current_user_payload),
):
    invoices = db.query(Invoice).filter(Invoice.project_id == project_id).all()
    if not invoices:
        raise HTTPException(status_code=404, detail="No invoices found for this project")
    return invoices

@app.put("/invoices/{invoice_id}/status", response_model=InvoiceOut)
def update_invoice_status(
    invoice_id: int,
    status_update: str, # e.g., "paid", "overdue"
    db: Session = Depends(get_db),
    token_payload: TokenPayload = Depends(get_current_user_payload),
):
    # Authorization check
    if token_payload.role not in ["accountant", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update invoices.",
        )

    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    invoice.status = status_update
    db.commit()
    db.refresh(invoice)
    return invoice
