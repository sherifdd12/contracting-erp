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
    width_mm: float
    height_mm: float
    message: str

# --- API Endpoints ---
@app.get("/")
def read_root():
    return {"service": "Computer Vision Service", "status": "running"}

# --- Constants for Measurement ---
# Using millimeters for backend calculations
A4_PAPER_DIMENSIONS_MM = {
    "width": 210,
    "height": 297
}
A4_ASPECT_RATIO = A4_PAPER_DIMENSIONS_MM["height"] / A4_PAPER_DIMENSIONS_MM["width"]


@app.post("/measure/", response_model=MeasurementOut)
async def measure_image(
    file: UploadFile = File(...),
    token: TokenPayload = Depends(get_current_user_payload),
):
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(status_code=400, detail="Could not decode image.")

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edged = cv2.Canny(blurred, 50, 150)
        contours, _ = cv2.findContours(edged.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        if len(contours) < 2:
            raise HTTPException(status_code=400, detail="Could not find at least two objects (reference and target) in the image.")

        # Sort contours by area and get the two largest
        contours = sorted(contours, key=cv2.contourArea, reverse=True)[:2]

        # Identify A4 paper by aspect ratio
        ref_contour, target_contour = None, None

        c1_x, c1_y, c1_w, c1_h = cv2.boundingRect(contours[0])
        c2_x, c2_y, c2_w, c2_h = cv2.boundingRect(contours[1])

        ar1 = c1_h / float(c1_w)
        ar2 = c2_h / float(c2_w)

        # Compare aspect ratios to the known A4 ratio
        if abs(ar1 - A4_ASPECT_RATIO) < abs(ar2 - A4_ASPECT_RATIO):
            ref_contour = contours[0]
            target_contour = contours[1]
        else:
            ref_contour = contours[1]
            target_contour = contours[0]

        # Calculate pixels per millimeter from the reference object
        ref_x, ref_y, ref_w, ref_h = cv2.boundingRect(ref_contour)
        # Using the average of width and height ratios for more stability
        pixels_per_mm = (ref_w / A4_PAPER_DIMENSIONS_MM["width"] + ref_h / A4_PAPER_DIMENSIONS_MM["height"]) / 2.0

        if pixels_per_mm == 0:
            raise HTTPException(status_code=500, detail="Could not calculate pixel-to-mm ratio. Reference object might be too small or not found correctly.")

        # Calculate the real-world dimensions of the target object
        target_x, target_y, target_w, target_h = cv2.boundingRect(target_contour)
        width_mm = target_w / pixels_per_mm
        height_mm = target_h / pixels_per_mm

        corners = [
            Point(x=target_x, y=target_y),
            Point(x=target_x + target_w, y=target_y),
            Point(x=target_x + target_w, y=target_y + target_h),
            Point(x=target_x, y=target_y + target_h),
        ]

        return MeasurementOut(
            corners=corners,
            width_mm=width_mm,
            height_mm=height_mm,
            message=f"Successfully measured object."
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred during image processing: {str(e)}")
