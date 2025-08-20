import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# It's crucial that the DATABASE_URL is correctly set in the environment where the service runs.
# The default value is for local development and should not be used in production.
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:pass@localhost/contracting_db")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """
    FastAPI dependency to get a database session.
    Ensures the database session is always closed after the request.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
