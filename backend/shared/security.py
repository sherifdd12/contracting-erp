import os
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel

# This is the central configuration for JWTs.
# It should be consistent across all services that use it.
SECRET_KEY = os.getenv("SECRET_KEY", "a-very-secret-key-that-is-not-secure")
ALGORITHM = "HS256"

# The tokenUrl should point to the login endpoint of the auth service.
# This is used for generating OpenAPI documentation.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")

class TokenPayload(BaseModel):
    sub: str | None = None
    role: str | None = None

def get_current_user_payload(token: str = Depends(oauth2_scheme)) -> TokenPayload:
    """
    Dependency to get the current user's payload from the JWT token.

    This function decodes the token, validates its signature and expiration,
    and returns the payload. It raises an HTTP 401 Unauthorized error if
    the token is invalid or missing.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenPayload(**payload)
    except JWTError:
        raise credentials_exception

    return token_data
