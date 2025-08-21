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
