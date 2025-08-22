import os
import sys
from typing import List

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

# Add parent directory to path to import shared modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from shared.database import get_db
from shared.models import Project, Invoice, Quotation, Account
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

class ReportLine(BaseModel):
    account_name: str
    balance: float

class ProfitAndLoss(BaseModel):
    total_revenue: float
    total_expense: float
    net_income: float
    revenue_lines: List[ReportLine]
    expense_lines: List[ReportLine]

class BalanceSheet(BaseModel):
    total_assets: float
    total_liabilities: float
    total_equity: float
    asset_lines: List[ReportLine]
    liability_lines: List[ReportLine]
    equity_lines: List[ReportLine]

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

@app.get("/reports/profit-and-loss", response_model=ProfitAndLoss)
def get_profit_and_loss(
    db: Session = Depends(get_db),
    token: TokenPayload = Depends(get_current_user_payload),
):
    if token.role not in ["accountant", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to view financial reports.")

    revenue_accounts = db.query(Account).filter(Account.type == 'Revenue').all()
    expense_accounts = db.query(Account).filter(Account.type == 'Expense').all()

    total_revenue = sum(acc.balance for acc in revenue_accounts)
    total_expense = sum(acc.balance for acc in expense_accounts)
    net_income = total_revenue - total_expense

    return ProfitAndLoss(
        total_revenue=total_revenue,
        total_expense=total_expense,
        net_income=net_income,
        revenue_lines=[ReportLine(account_name=acc.name, balance=acc.balance) for acc in revenue_accounts],
        expense_lines=[ReportLine(account_name=acc.name, balance=acc.balance) for acc in expense_accounts],
    )

@app.get("/reports/balance-sheet", response_model=BalanceSheet)
def get_balance_sheet(
    db: Session = Depends(get_db),
    token: TokenPayload = Depends(get_current_user_payload),
):
    if token.role not in ["accountant", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to view financial reports.")

    asset_accounts = db.query(Account).filter(Account.type == 'Asset').all()
    liability_accounts = db.query(Account).filter(Account.type == 'Liability').all()
    equity_accounts = db.query(Account).filter(Account.type == 'Equity').all()

    total_assets = sum(acc.balance for acc in asset_accounts)
    total_liabilities = sum(acc.balance for acc in liability_accounts)
    total_equity = sum(acc.balance for acc in equity_accounts)

    # Basic accounting equation check (can't enforce here, just for reporting)
    # total_assets should equal total_liabilities + total_equity

    return BalanceSheet(
        total_assets=total_assets,
        total_liabilities=total_liabilities,
        total_equity=total_equity,
        asset_lines=[ReportLine(account_name=acc.name, balance=acc.balance) for acc in asset_accounts],
        liability_lines=[ReportLine(account_name=acc.name, balance=acc.balance) for acc in liability_accounts],
        equity_lines=[ReportLine(account_name=acc.name, balance=acc.balance) for acc in equity_accounts],
    )
