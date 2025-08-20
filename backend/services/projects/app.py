import os
import sys
from typing import List

from fastapi import Depends, FastAPI, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

# Add parent directory to path to import shared modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from shared.database import get_db
from shared.models import Project, User
from shared.security import get_current_user_payload, TokenPayload

# --- FastAPI App ---
app = FastAPI()

# --- Pydantic Schemas ---
class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    budget: float

class ProjectOut(BaseModel):
    id: int
    name: str
    description: str | None = None
    budget: float
    manager_id: int | None = None

    class Config:
        orm_mode = True

# --- API Endpoints ---
@app.get("/")
def read_root():
    return {"service": "Projects Service", "status": "running"}

@app.post("/projects/", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    project: ProjectCreate,
    db: Session = Depends(get_db),
    token_payload: TokenPayload = Depends(get_current_user_payload),
):
    # Find the user to associate as the manager
    user = db.query(User).filter(User.username == token_payload.sub).first()
    if not user:
        raise HTTPException(status_code=404, detail="Manager user not found")

    new_project = Project(**project.dict(), manager_id=user.id)
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return new_project

@app.get("/projects/", response_model=List[ProjectOut])
def get_all_projects(
    db: Session = Depends(get_db),
    token_payload: TokenPayload = Depends(get_current_user_payload),
):
    # In a real app, you might filter by user or role
    projects = db.query(Project).all()
    return projects

@app.get("/projects/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    token_payload: TokenPayload = Depends(get_current_user_payload),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@app.put("/projects/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int,
    project_update: ProjectCreate,
    db: Session = Depends(get_db),
    token_payload: TokenPayload = Depends(get_current_user_payload),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Add authorization logic here, e.g., only manager or admin can update
    # if project.manager_id != user.id and token_payload.role != 'admin':
    #     raise HTTPException(status_code=403, detail="Not authorized to update this project")

    project.name = project_update.name
    project.description = project_update.description
    project.budget = project_update.budget
    db.commit()
    db.refresh(project)
    return project

@app.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    token_payload: TokenPayload = Depends(get_current_user_payload),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Add authorization logic here
    # if token_payload.role != 'admin':
    #     raise HTTPException(status_code=403, detail="Only admins can delete projects")

    db.delete(project)
    db.commit()
    return None
