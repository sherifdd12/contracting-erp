from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(128), nullable=False)
    role = Column(String(50), nullable=False)

    tasks = relationship("Task", back_populates="assignee")

class Project(Base):
    __tablename__ = 'projects'
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    budget = Column(Float, nullable=False)
    actual_cost = Column(Float, default=0.0)
    start_date = Column(DateTime, default=datetime.utcnow)
    end_date = Column(DateTime)
    percentage_complete = Column(Float, default=0.0)
    manager_id = Column(Integer, ForeignKey('users.id'))

    manager = relationship('User')
    tasks = relationship("Task", back_populates="project")
    invoices = relationship("Invoice", back_populates="project")

class Task(Base):
    __tablename__ = 'tasks'
    id = Column(Integer, primary_key=True)
    description = Column(Text, nullable=False)
    status = Column(String(50), default='pending')
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=False)
    assigned_to_id = Column(Integer, ForeignKey('users.id'))

    project = relationship('Project', back_populates="tasks")
    assignee = relationship('User')

class Invoice(Base):
    __tablename__ = 'invoices'
    id = Column(Integer, primary_key=True)
    amount = Column(Float, nullable=False)
    status = Column(String(50), default='pending') # e.g., pending, paid, overdue
    due_date = Column(DateTime)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=False)

    project = relationship('Project', back_populates="invoices")


# --- HR Models ---
class Employee(Base):
    __tablename__ = 'employees'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    job_title = Column(String(100))
    hire_date = Column(DateTime, default=datetime.utcnow)
    salary = Column(Float)

    user = relationship('User', back_populates='employee_profile')
    leave_requests = relationship('LeaveRequest', back_populates='employee')

class LeaveRequest(Base):
    __tablename__ = 'leave_requests'
    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey('employees.id'), nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    reason = Column(Text)
    status = Column(String(50), default='pending') # e.g., pending, approved, rejected

    employee = relationship('Employee', back_populates='leave_requests')

# Add back-population to User model
User.employee_profile = relationship("Employee", uselist=False, back_populates="user")


# --- Quotation Models ---
class Quotation(Base):
    __tablename__ = 'quotations'
    id = Column(Integer, primary_key=True)
    client_name = Column(String(100), nullable=False)
    status = Column(String(50), default='draft') # e.g., draft, sent, accepted, rejected
    total_amount = Column(Float, nullable=False)
    created_date = Column(DateTime, default=datetime.utcnow)
    project_id = Column(Integer, ForeignKey('projects.id'))
    created_by_id = Column(Integer, ForeignKey('users.id'))

    project = relationship('Project')
    created_by = relationship('User')
    items = relationship('QuotationItem', back_populates='quotation', cascade="all, delete-orphan")

class QuotationItem(Base):
    __tablename__ = 'quotation_items'
    id = Column(Integer, primary_key=True)
    quotation_id = Column(Integer, ForeignKey('quotations.id'), nullable=False)
    description = Column(Text, nullable=False)
    quantity = Column(Float, nullable=False)
    unit_price = Column(Float, nullable=False)

    quotation = relationship('Quotation', back_populates='items')

# Add back-population to Project model
Project.quotations = relationship("Quotation", back_populates="project")


# --- Activity Log Model ---
class ActivityLog(Base):
    __tablename__ = 'activity_logs'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    action = Column(String(100), nullable=False)
    details = Column(Text) # Can store JSON as string
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship('User')


# --- Core Accounting Models ---
class Account(Base):
    """Represents an account in the Chart of Accounts."""
    __tablename__ = 'accounts'
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    type = Column(String(50), nullable=False) # Asset, Liability, Equity, Revenue, Expense
    normal_balance = Column(String(10), nullable=False) # 'debit' or 'credit'
    balance = Column(Float, default=0.0, nullable=False)

    journal_lines = relationship('JournalEntryLine', back_populates='account')

class JournalEntry(Base):
    """Represents a single, balanced financial transaction (a collection of debits and credits)."""
    __tablename__ = 'journal_entries'
    id = Column(Integer, primary_key=True)
    date = Column(DateTime, default=datetime.utcnow, nullable=False)
    description = Column(String(255), nullable=False)

    lines = relationship('JournalEntryLine', back_populates='entry', cascade="all, delete-orphan")

class JournalEntryLine(Base):
    """Represents a single line (a debit or credit) within a Journal Entry."""
    __tablename__ = 'journal_entry_lines'
    id = Column(Integer, primary_key=True)
    entry_id = Column(Integer, ForeignKey('journal_entries.id'), nullable=False)
    account_id = Column(Integer, ForeignKey('accounts.id'), nullable=False)
    type = Column(String(10), nullable=False) # 'debit' or 'credit'
    amount = Column(Float, nullable=False)

    entry = relationship('JournalEntry', back_populates='lines')
    account = relationship('Account', back_populates='journal_lines')


# --- Accounts Payable Models ---
class Vendor(Base):
    """Represents a supplier or vendor."""
    __tablename__ = 'vendors'
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    contact_person = Column(String(100))
    email = Column(String(120))
    phone = Column(String(50))

    bills = relationship('Bill', back_populates='vendor')

class Bill(Base):
    """Represents a bill received from a vendor."""
    __tablename__ = 'bills'
    id = Column(Integer, primary_key=True)
    vendor_id = Column(Integer, ForeignKey('vendors.id'), nullable=False)
    amount = Column(Float, nullable=False)
    due_date = Column(DateTime)
    paid_date = Column(DateTime)
    status = Column(String(50), default='unpaid') # unpaid, paid

    vendor = relationship('Vendor', back_populates='bills')
