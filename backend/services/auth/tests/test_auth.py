import os
import sys
from fastapi.testclient import TestClient

# Add the service's root to the Python path to allow for direct import of app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app

client = TestClient(app)

def test_read_root():
    """
    Test the root endpoint to ensure the service is running.
    """
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"service": "Authentication Service", "status": "running"}
