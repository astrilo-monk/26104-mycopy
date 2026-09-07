from contextlib import asynccontextmanager
import os

from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    status
)
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy.orm import Session

try:
    from .auth import hash_password, verify_password, create_access_token, get_current_user
    from .database import Base, engine, get_db
    from .models import User
    from .schemas import SignupRequest, LoginRequest, UserResponse, TokenResponse
except ImportError:
    from auth import hash_password, verify_password, create_access_token, get_current_user
    from database import Base, engine, get_db
    from models import User
    from schemas import SignupRequest, LoginRequest, UserResponse, TokenResponse

try:
    from common_auth import get_secret_key
except ImportError:
    from ..common_auth import get_secret_key


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Fail fast on missing configuration and create the Postgres user table."""
    get_secret_key()
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="AASIST Login System",
    version="1.0",
    lifespan=lifespan,
)

# Localhost is the only default. Set CORS_ALLOWED_ORIGINS to the exact deployed
# frontend origin (or a comma-separated list during a staged cutover).
allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


# =========================
# HOME
# =========================

@app.get("/")
def home():

    return {
        "message": "AASIST Authentication Server Running"
    }


# =========================
# SIGNUP
# =========================

@app.post(
    "/signup",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
def signup(

    data: SignupRequest,

    db: Session = Depends(get_db)

):

    existing_user = db.query(User).filter(
        User.email == data.email
    ).first()

    if existing_user:

        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    new_user = User(

        name=data.name,

        email=data.email,

        password=hash_password(
            data.password
        )
    )

    db.add(new_user)

    db.commit()

    db.refresh(new_user)

    return new_user


# =========================
# LOGIN
# =========================

@app.post(
    "/login",
    response_model=TokenResponse
)
def login(

    data: LoginRequest,

    db: Session = Depends(get_db)

):

    user = db.query(User).filter(
        User.email == data.email
    ).first()

    if not user:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    password_correct = verify_password(

        data.password,

        user.password
    )

    if not password_correct:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    token = create_access_token(str(user.id))

    return {

        "access_token": token,

        "token_type": "bearer"
    }


# =========================
# CURRENT USER
# =========================

@app.get(
    "/me",
    response_model=UserResponse
)
def me(

    current_user: User = Depends(
        get_current_user
    )

):

    return current_user


# =========================
# PROTECTED DASHBOARD
# =========================

@app.get("/dashboard")
def dashboard(

    current_user: User = Depends(
        get_current_user
    )

):

    return {

        "message": f"Welcome {current_user.name}",

        "user_id": current_user.id,

        "email": current_user.email
    }
