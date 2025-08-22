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
REFERENCE_OBJECTS = {
    "A4_PAPER": {"width": 210, "height": 297},
    "CREDIT_CARD": {"width": 85.6, "height": 53.98}
}
for key, value in REFERENCE_OBJECTS.items():
    value["aspect_ratio"] = value["height"] / value["width"]


@app.post("/measure/", response_model=MeasurementOut)
async def measure_image(
    file: UploadFile = File(...),
    reference_type: str = Form("A4_PAPER"),
    token: TokenPayload = Depends(get_current_user_payload),
):
    if reference_type not in REFERENCE_OBJECTS:
        raise HTTPException(status_code=400, detail="Invalid reference object type.")

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

        c1_x, c1_y, c1_w, c1_h = cv2.boundingRect(contours[0])
        c2_x, c2_y, c2_w, c2_h = cv2.boundingRect(contours[1])

        # Handle potential division by zero if a contour has zero width
        ar1 = c1_h / float(c1_w) if c1_w > 0 else 0
        ar2 = c2_h / float(c2_w) if c2_w > 0 else 0

        ref_details = REFERENCE_OBJECTS[reference_type]
        ref_aspect_ratio = ref_details["aspect_ratio"]

        # Compare aspect ratios to the known reference ratio
        if abs(ar1 - ref_aspect_ratio) < abs(ar2 - ref_aspect_ratio):
            ref_contour, target_contour = contours[0], contours[1]
            ref_w, ref_h = c1_w, c1_h
        else:
            ref_contour, target_contour = contours[1], contours[0]
            ref_w, ref_h = c2_w, c2_h

        # Calculate pixels per millimeter from the reference object
        # Using the average of width and height ratios for more stability
        pixels_per_mm_w = ref_w / ref_details["width"] if ref_details["width"] > 0 else 0
        pixels_per_mm_h = ref_h / ref_details["height"] if ref_details["height"] > 0 else 0

        if pixels_per_mm_w == 0 or pixels_per_mm_h == 0:
             raise HTTPException(status_code=500, detail="Could not calculate pixel-to-mm ratio from reference object dimension.")

        pixels_per_mm = (pixels_per_mm_w + pixels_per_mm_h) / 2.0

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
