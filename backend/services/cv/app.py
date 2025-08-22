import os
import sys
import cv2
import numpy as np
from typing import List

from fastapi import Depends, FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Add parent directory to path to import shared modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
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
class Point(BaseModel):
    x: int
    y: int

class MeasurementOut(BaseModel):
    corners: List[Point]
    message: str

# --- API Endpoints ---
@app.get("/")
def read_root():
    return {"service": "Computer Vision Service", "status": "running"}

@app.post("/measure/", response_model=MeasurementOut)
async def measure_image(
    file: UploadFile = File(...),
    token: TokenPayload = Depends(get_current_user_payload),
):
    try:
        # Read image contents
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Could not decode image.")

        # --- Image Processing Pipeline ---
        # 1. Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        # 2. Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        # 3. Use Canny edge detection
        edged = cv2.Canny(blurred, 50, 150)
        # 4. Find contours
        contours, _ = cv2.findContours(edged.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        if not contours:
            raise HTTPException(status_code=400, detail="No contours found in image.")

        # 5. Find the largest contour by area
        try:
            largest_contour = max(contours, key=cv2.contourArea)
        except ValueError:
            raise HTTPException(status_code=400, detail="Could not find a main object in contours.")

        # 6. Get the bounding box of the largest contour
        x, y, w, h = cv2.boundingRect(largest_contour)

        # 7. Define the four corners of the bounding box
        corners = [
            Point(x=x, y=y),             # Top-left
            Point(x=x + w, y=y),         # Top-right
            Point(x=x + w, y=y + h),     # Bottom-right
            Point(x=x, y=y + h),         # Bottom-left
        ]

        return MeasurementOut(
            corners=corners,
            message="Successfully detected the largest object."
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred during image processing: {str(e)}")
