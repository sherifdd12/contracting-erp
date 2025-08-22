# Use the full Python image to ensure all system dependencies for OpenCV are present
FROM python:3.12

# Set the working directory in the container
WORKDIR /app

# No system dependencies are needed for opencv-python-headless

# Copy the requirements file from the backend root and install dependencies.
# The build context for this Dockerfile is expected to be the `backend` directory.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend source code (including the `shared` and `services` directories)
COPY . .

# Expose port 80 for the FastAPI application
EXPOSE 80

# Command to run the Uvicorn server for the cv app.
# The app is located at services/cv/app.py
CMD ["uvicorn", "services.cv.app:app", "--host", "0.0.0.0", "--port", "80"]
