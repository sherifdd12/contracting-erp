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
from shared.models import Task, Project, User
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
class TaskCreate(BaseModel):
    description: str
    project_id: int
    assigned_to_id: int

class TaskUpdate(BaseModel):
    status: str

class TaskOut(BaseModel):
    id: int
    description: str
    status: str
    project_id: int
    assigned_to_id: int
    class Config: orm_mode = True

# --- API Endpoints ---
@app.get("/")
def read_root():
    return {"service": "Tasks Service", "status": "running"}

@app.post("/tasks/", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    task: TaskCreate,
    db: Session = Depends(get_db),
    token: TokenPayload = Depends(get_current_user_payload),
):
    # Authorization: Check if user is manager of the project or an admin
    project = db.query(Project).filter(Project.id == task.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    user = db.query(User).filter(User.username == token.sub).first()
    if not user:
        raise HTTPException(status_code=404, detail="Current user not found.")

    if project.manager_id != user.id and token.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to create tasks for this project.")

    # Check if assignee exists
    assignee = db.query(User).filter(User.id == task.assigned_to_id).first()
    if not assignee:
        raise HTTPException(status_code=404, detail="Assignee user not found.")

    new_task = Task(**task.dict(), status="pending")
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task

@app.get("/tasks/project/{project_id}", response_model=List[TaskOut])
def get_tasks_for_project(
    project_id: int,
    db: Session = Depends(get_db),
    token: TokenPayload = Depends(get_current_user_payload),
):
    # In a real app, you might check if the user is part of the project
    tasks = db.query(Task).filter(Task.project_id == project_id).all()
    return tasks

@app.put("/tasks/{task_id}/status", response_model=TaskOut)
def update_task_status(
    task_id: int,
    task_update: TaskUpdate,
    db: Session = Depends(get_db),
    token: TokenPayload = Depends(get_current_user_payload),
):
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found.")

    # Authorization: Check if user is assignee, manager, or admin
    user = db.query(User).filter(User.username == token.sub).first()
    if not user:
        raise HTTPException(status_code=404, detail="Current user not found.")

    if (db_task.assigned_to_id != user.id and
        db_task.project.manager_id != user.id and
        token.role != "admin"):
        raise HTTPException(status_code=403, detail="Not authorized to update this task.")

    db_task.status = task_update.status
    db.commit()
    db.refresh(db_task)
    return db_task
