import os
import httpx

ACTIVITY_SERVICE_URL = os.getenv("ACTIVITY_SERVICE_URL", "http://localhost:8008/activities/")

async def log_activity(token: str, action: str, details: str | None = None):
    """
    Makes an asynchronous API call to the activity service to log an action.
    """
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"action": action, "details": details}

    async with httpx.AsyncClient() as client:
        try:
            await client.post(ACTIVITY_SERVICE_URL, json=payload, headers=headers)
            # We can choose to log errors here if the activity service fails
            # but for now, we'll fail silently to not interrupt the main request.
        except httpx.RequestError as e:
            # In a real app, you would have robust logging here.
            print(f"Could not log activity: {e}")
