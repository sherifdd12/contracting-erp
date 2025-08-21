import os
import sys

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

# Add parent directory to path to import shared modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from shared.database import get_db
from shared.models import Project, Invoice, Quotation
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
class AnalyticsSummary(BaseModel):
    total_projects: int
    total_project_budget: float
    total_invoice_paid: float
    total_quotes_accepted: float

# --- API Endpoints ---
@app.get("/")
def read_root():
    return {"service": "Analytics Service", "status": "running"}

@app.get("/analytics/summary", response_model=AnalyticsSummary)
def get_analytics_summary(
    db: Session = Depends(get_db),
    token: TokenPayload = Depends(get_current_user_payload),
):
    # This endpoint could be restricted by role, e.g., admin or sales

    total_projects = db.query(func.count(Project.id)).scalar() or 0
    total_project_budget = db.query(func.sum(Project.budget)).scalar() or 0.0

    total_invoice_paid = db.query(func.sum(Invoice.amount)).filter(Invoice.status == 'paid').scalar() or 0.0

    total_quotes_accepted = db.query(func.sum(Quotation.total_amount)).filter(Quotation.status == 'accepted').scalar() or 0.0

    return AnalyticsSummary(
        total_projects=total_projects,
        total_project_budget=total_project_budget,
        total_invoice_paid=total_invoice_paid,
        total_quotes_accepted=total_quotes_accepted,
    )
