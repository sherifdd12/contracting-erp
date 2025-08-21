import os
import sys
from typing import List

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

# Add parent directory to path to import shared modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from shared.database import get_db
from shared.models import Quotation, QuotationItem, Project, User
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
class QuotationItemBase(BaseModel):
    description: str
    quantity: float
    unit_price: float

class QuotationItemCreate(QuotationItemBase):
    pass

class QuotationItemOut(QuotationItemBase):
    id: int
    class Config: orm_mode = True

class QuotationCreate(BaseModel):
    client_name: str
    project_id: int | None = None
    items: List[QuotationItemCreate]

class QuotationOut(BaseModel):
    id: int
    client_name: str
    status: str
    total_amount: float
    project_id: int | None = None
    created_by_id: int
    items: List[QuotationItemOut]
    class Config: orm_mode = True

# --- API Endpoints ---
@app.get("/")
def read_root():
    return {"service": "Quotes Service", "status": "running"}

@app.post("/quotes/", response_model=QuotationOut, status_code=status.HTTP_201_CREATED)
def create_quotation(
    quote: QuotationCreate,
    db: Session = Depends(get_db),
    token: TokenPayload = Depends(get_current_user_payload),
):
    if token.role not in ["sales", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to create quotations.")

    user = db.query(User).filter(User.username == token.sub).first()
    if not user:
        raise HTTPException(status_code=404, detail="Creator user not found.")

    # Calculate total amount on the backend for security
    total_amount = sum(item.quantity * item.unit_price for item in quote.items)

    db_quote = Quotation(
        client_name=quote.client_name,
        project_id=quote.project_id,
        total_amount=total_amount,
        created_by_id=user.id,
    )

    db.add(db_quote)
    db.flush() # Flush to get the db_quote.id for the items

    for item in quote.items:
        db_item = QuotationItem(**item.dict(), quotation_id=db_quote.id)
        db.add(db_item)

    db.commit()
    db.refresh(db_quote)
    return db_quote

@app.get("/quotes/", response_model=List[QuotationOut])
def get_all_quotations(
    db: Session = Depends(get_db),
    token: TokenPayload = Depends(get_current_user_payload),
):
    return db.query(Quotation).all()

@app.get("/quotes/{quote_id}", response_model=QuotationOut)
def get_quotation(
    quote_id: int,
    db: Session = Depends(get_db),
    token: TokenPayload = Depends(get_current_user_payload),
):
    db_quote = db.query(Quotation).filter(Quotation.id == quote_id).first()
    if not db_quote:
        raise HTTPException(status_code=404, detail="Quotation not found.")
    return db_quote
