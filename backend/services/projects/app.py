import os
import sys
import shutil
from typing import List
from datetime import datetime

from fastapi import Depends, FastAPI, HTTPException, status, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

# Add parent directory to path to import shared modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from shared.database import get_db
from shared.models import Project, User, SavedMeasurement
from shared.security import get_current_user_payload, TokenPayload, oauth2_scheme
from shared.activity_logger import log_activity

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

class SavedMeasurementOut(BaseModel):
    id: int
    project_id: int
    description: str
    width_cm: float
    height_cm: float
    image_path: str
    created_at: datetime

    class Config:
        orm_mode = True

# --- API Endpoints ---
@app.get("/")
def read_root():
    return {"service": "Projects Service", "status": "running"}

@app.post("/projects/", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    project: ProjectCreate,
    db: Session = Depends(get_db),
    token_payload: TokenPayload = Depends(get_current_user_payload),
    token: str = Depends(oauth2_scheme), # Get raw token for logging
):
    # Find the user to associate as the manager
    user = db.query(User).filter(User.username == token_payload.sub).first()
    if not user:
        raise HTTPException(status_code=404, detail="Manager user not found")

    new_project = Project(**project.dict(), manager_id=user.id)
    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    # Log the activity
    await log_activity(token, action="create_project", details=f"Project '{new_project.name}' created.")

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

@app.post("/projects/{project_id}/measurements/", response_model=SavedMeasurementOut, status_code=status.HTTP_201_CREATED)
async def create_measurement_for_project(
    project_id: int,
    description: str = Form(...),
    width_cm: float = Form(...),
    height_cm: float = Form(...),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    token_payload: TokenPayload = Depends(get_current_user_payload),
):
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Define upload path and save the file
    upload_dir = "/app/uploads"
    os.makedirs(upload_dir, exist_ok=True)

    # Sanitize filename and create a unique path
    file_extension = os.path.splitext(image.filename)[1]
    unique_filename = f"{project_id}_{datetime.utcnow().timestamp()}{file_extension}"
    file_path = os.path.join(upload_dir, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)

    # Create database record
    new_measurement = SavedMeasurement(
        project_id=project_id,
        description=description,
        width_cm=width_cm,
        height_cm=height_cm,
        image_path=file_path  # Save path relative to the container
    )
    db.add(new_measurement)
    db.commit()
    db.refresh(new_measurement)

    return new_measurement
