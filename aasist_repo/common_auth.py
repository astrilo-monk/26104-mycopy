"""Shared JWT helpers used by the login and AASIST inference services."""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import jwt
from dotenv import load_dotenv


load_dotenv()

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


class TokenValidationError(Exception):
    """Raised when a bearer token is malformed, expired, or missing required claims."""


def get_secret_key() -> str:
    """Return the one secret shared by login, inference, and Spring Boot."""
    secret_key = os.getenv("SECRET_KEY")
    if not secret_key:
        raise RuntimeError("SECRET_KEY must be configured before starting an API service.")
    return secret_key


def create_access_token(subject: str) -> str:
    """Create the same short-lived HS256 token consumed by both backend APIs."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": subject, "exp": expire},
        get_secret_key(),
        algorithm=ALGORITHM,
    )


def get_token_subject(token: str) -> str:
    """Validate a bearer token and return its required string subject claim."""
    try:
        payload = jwt.decode(
            token,
            get_secret_key(),
            algorithms=[ALGORITHM],
            options={"require": ["exp", "sub"]},
        )
    except jwt.InvalidTokenError as exception:
        raise TokenValidationError("Invalid or expired token") from exception

    subject = payload.get("sub")
    if not isinstance(subject, str) or not subject.strip():
        raise TokenValidationError("Invalid or expired token")
    return subject
