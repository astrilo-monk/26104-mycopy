from pwdlib import PasswordHash

from fastapi import Depends, HTTPException, status

from fastapi.security import OAuth2PasswordBearer

from sqlalchemy.orm import Session

try:
    from .database import get_db
    from .models import User
except ImportError:
    from database import get_db
    from models import User

try:
    from common_auth import TokenValidationError, create_access_token, get_token_subject
except ImportError:
    from ..common_auth import TokenValidationError, create_access_token, get_token_subject


password_hash = PasswordHash.recommended()


oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/login"
)


# -------------------------
# PASSWORD HASHING
# -------------------------

def hash_password(password: str):

    return password_hash.hash(password)


def verify_password(
    password: str,
    hashed_password: str
):

    return password_hash.verify(
        password,
        hashed_password
    )


# -------------------------
# GET CURRENT USER
# -------------------------

def get_current_user(

    token: str = Depends(oauth2_scheme),

    db: Session = Depends(get_db)

):

    credentials_exception = HTTPException(

        status_code=status.HTTP_401_UNAUTHORIZED,

        detail="Invalid or expired token",

        headers={
            "WWW-Authenticate": "Bearer"
        }
    )

    try:

        user_id = get_token_subject(token)

    except TokenValidationError:

        raise credentials_exception

    try:
        user = db.query(User).filter(
            User.id == int(user_id)
        ).first()
    except ValueError:
        raise credentials_exception

    if user is None:
        raise credentials_exception

    return user
