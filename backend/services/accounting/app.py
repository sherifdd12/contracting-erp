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
from shared.models import Invoice, Project, Account, Vendor, Bill, JournalEntry, JournalEntryLine
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

class AccountCreate(BaseModel):
    name: str
    type: str
    normal_balance: str

class AccountOut(BaseModel):
    id: int
    name: str
    type: str
    normal_balance: str
    balance: float
    class Config: orm_mode = True

class JournalEntryLineCreate(BaseModel):
    account_id: int
    type: str  # 'debit' or 'credit'
    amount: float

class JournalEntryCreate(BaseModel):
    description: str
    lines: List[JournalEntryLineCreate]

# --- A/P Schemas ---
class VendorCreate(BaseModel):
    name: str
    contact_person: str | None = None
    email: str | None = None
    phone: str | None = None

class VendorOut(BaseModel):
    id: int
    name: str
    class Config: orm_mode = True

class BillCreate(BaseModel):
    vendor_id: int
    amount: float
    due_date: datetime | None = None
    expense_account_id: int # The account to debit (e.g., 'Office Supplies')

class BillOut(BaseModel):
    id: int
    vendor_id: int
    amount: float
    status: str
    class Config: orm_mode = True


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
    if token_payload.role not in ["accountant", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to create invoices.",
        )

    project = db.query(Project).filter(Project.id == invoice.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # --- Auto-generate Journal Entry for the Invoice ---
    # Find 'Accounts Receivable' (Asset) and 'Sales Revenue' (Revenue) accounts
    ar_acc = db.query(Account).filter(Account.name == "Accounts Receivable").first()
    revenue_acc = db.query(Account).filter(Account.name == "Sales Revenue").first()
    if not ar_acc or not revenue_acc:
        raise HTTPException(status_code=500, detail="Core accounting accounts ('Accounts Receivable' or 'Sales Revenue') not found.")

    # Create the Invoice
    new_invoice = Invoice(**invoice.dict(), status="pending")
    db.add(new_invoice)

    # Create the balanced Journal Entry
    journal_entry = JournalEntry(description=f"Invoice for project {project.name}")
    db.add(journal_entry)
    db.flush()

    # Debit Accounts Receivable, Credit Sales Revenue
    debit_line = JournalEntryLine(entry_id=journal_entry.id, account_id=ar_acc.id, type='debit', amount=invoice.amount)
    credit_line = JournalEntryLine(entry_id=journal_entry.id, account_id=revenue_acc.id, type='credit', amount=invoice.amount)
    db.add_all([debit_line, credit_line])

    # Update account balances
    ar_acc.balance += invoice.amount # Debit increases asset
    revenue_acc.balance += invoice.amount # Credit increases revenue

    db.commit()
    db.refresh(new_invoice)
    return new_invoice

@app.get("/invoices/project/{project_id}", response_model=List[InvoiceOut])
def get_invoices_for_project(
    project_id: int,
    db: Session = Depends(get_db),
    token_payload: TokenPayload = Depends(get_current_user_payload),
):
    # It's correct to return an empty list if no invoices are found for a project.
    # A 404 should only be returned if the project itself does not exist.
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    invoices = db.query(Invoice).filter(Invoice.project_id == project_id).all()
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


# --- Chart of Accounts Endpoints ---
@app.post("/accounts/", response_model=AccountOut, status_code=status.HTTP_201_CREATED)
def create_account(
    account: AccountCreate,
    db: Session = Depends(get_db),
    token: TokenPayload = Depends(get_current_user_payload),
):
    if token.role not in ["accountant", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to manage accounts.")

    db_account = Account(**account.dict())
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return db_account

@app.get("/accounts/", response_model=List[AccountOut])
def get_all_accounts(
    db: Session = Depends(get_db),
    token: TokenPayload = Depends(get_current_user_payload),
):
    if token.role not in ["accountant", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to view accounts.")

    return db.query(Account).order_by(Account.type, Account.name).all()


# --- A/P Endpoints ---
@app.post("/vendors/", response_model=VendorOut, status_code=status.HTTP_201_CREATED)
def create_vendor(
    vendor: VendorCreate,
    db: Session = Depends(get_db),
    token: TokenPayload = Depends(get_current_user_payload),
):
    if token.role not in ["accountant", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to manage vendors.")

    db_vendor = Vendor(**vendor.dict())
    db.add(db_vendor)
    db.commit()
    db.refresh(db_vendor)
    return db_vendor

@app.get("/vendors/", response_model=List[VendorOut])
def get_all_vendors(
    db: Session = Depends(get_db),
    token: TokenPayload = Depends(get_current_user_payload),
):
    if token.role not in ["accountant", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to view vendors.")
    return db.query(Vendor).all()

@app.post("/bills/", response_model=BillOut, status_code=status.HTTP_201_CREATED)
def create_bill(
    bill: BillCreate,
    db: Session = Depends(get_db),
    token: TokenPayload = Depends(get_current_user_payload),
):
    if token.role not in ["accountant", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to create bills.")

    # Find the 'Accounts Payable' liability account
    accounts_payable_acc = db.query(Account).filter(Account.name == "Accounts Payable").first()
    if not accounts_payable_acc:
        raise HTTPException(status_code=500, detail="'Accounts Payable' account not found in Chart of Accounts.")

    # Find the expense account to debit
    expense_acc = db.query(Account).filter(Account.id == bill.expense_account_id).first()
    if not expense_acc:
        raise HTTPException(status_code=400, detail="Expense account not found.")

    # Create the Bill
    db_bill = Bill(vendor_id=bill.vendor_id, amount=bill.amount, due_date=bill.due_date)
    db.add(db_bill)

    # Create the balanced Journal Entry for this bill
    journal_entry = JournalEntry(description=f"Bill from vendor {db_bill.vendor_id}")
    db.add(journal_entry)
    db.flush()

    # Debit Expense, Credit Accounts Payable
    debit_line = JournalEntryLine(entry_id=journal_entry.id, account_id=expense_acc.id, type='debit', amount=bill.amount)
    credit_line = JournalEntryLine(entry_id=journal_entry.id, account_id=accounts_payable_acc.id, type='credit', amount=bill.amount)
    db.add_all([debit_line, credit_line])

    # Update account balances
    expense_acc.balance += bill.amount # Debit increases expense
    accounts_payable_acc.balance += bill.amount # Credit increases liability

    db.commit()
    db.refresh(db_bill)
    return db_bill


# --- Journal Entry Endpoints ---
@app.post("/journal-entries/", status_code=status.HTTP_201_CREATED)
def create_journal_entry(
    entry: JournalEntryCreate,
    db: Session = Depends(get_db),
    token: TokenPayload = Depends(get_current_user_payload),
):
    if token.role not in ["accountant", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to create journal entries.")

    # --- Validation: Entry must be balanced ---
    total_debits = sum(line.amount for line in entry.lines if line.type == 'debit')
    total_credits = sum(line.amount for line in entry.lines if line.type == 'credit')

    if round(total_debits, 2) != round(total_credits, 2):
        raise HTTPException(
            status_code=400,
            detail=f"The journal entry is not balanced. Debits ({total_debits}) do not equal Credits ({total_credits})."
        )

    # --- Create Entry and Lines, Update Account Balances ---
    db_entry = JournalEntry(description=entry.description)
    db.add(db_entry)
    db.flush() # Flush to get the entry ID

    for line in entry.lines:
        account = db.query(Account).filter(Account.id == line.account_id).first()
        if not account:
            raise HTTPException(status_code=400, detail=f"Account with ID {line.account_id} not found.")

        db_line = JournalEntryLine(
            entry_id=db_entry.id,
            account_id=line.account_id,
            type=line.type,
            amount=line.amount
        )
        db.add(db_line)

        # Update account balance
        if account.normal_balance == line.type:
            account.balance += line.amount
        else:
            account.balance -= line.amount

    db.commit()
    return {"message": "Journal entry created successfully", "entry_id": db_entry.id}
