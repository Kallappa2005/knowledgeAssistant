from datetime import UTC, datetime

from fastapi import APIRouter, Cookie, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api_dependencies import CurrentUser, DatabaseSession
from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_refresh_token,
    refresh_token_expiry,
)
from app.models.entities import RefreshToken, User, UserRole
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, UserResponse
from app.services.auth_service import (
    auth_response,
    authenticate_user,
    create_employee,
    user_response,
)

router = APIRouter(prefix="/auth", tags=["authentication"])


def set_refresh_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=settings.refresh_token_cookie_name,
        value=token,
        httponly=True,
        secure=settings.secure_cookies,
        samesite=settings.refresh_token_samesite,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        path="/auth",
    )


@router.post(
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
def register(payload: RegisterRequest, db: DatabaseSession) -> UserResponse:
    try:
        user = create_employee(
            db, payload.email.lower(), payload.full_name, payload.password
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(error)
        ) from error
    return user_response(user)


@router.post("/login", response_model=AuthResponse)
def login(
    payload: LoginRequest, response: Response, db: DatabaseSession
) -> AuthResponse:
    user = authenticate_user(db, payload.email.lower(), payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    auth_result, refresh_token = auth_response(db, user)
    set_refresh_cookie(response, refresh_token)
    return auth_result


@router.post("/refresh", response_model=AuthResponse)
def refresh(
    response: Response,
    db: DatabaseSession,
    refresh_token: str | None = Cookie(default=None),
) -> AuthResponse:
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is required.",
        )

    stored_token = db.scalar(
        select(RefreshToken).where(
            RefreshToken.token_hash == hash_refresh_token(refresh_token)
        )
    )
    if (
        stored_token is None
        or stored_token.revoked_at is not None
        or stored_token.expires_at <= datetime.now(UTC)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token."
        )

    user = db.scalar(
        select(User)
        .options(selectinload(User.user_roles).selectinload(UserRole.role))
        .where(User.id == stored_token.user_id, User.is_active.is_(True))
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token."
        )

    stored_token.revoked_at = datetime.now(UTC)
    new_refresh_token = generate_refresh_token()
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_refresh_token(new_refresh_token),
            expires_at=refresh_token_expiry(),
        )
    )
    db.commit()
    result = AuthResponse(
        access_token=create_access_token(user.id), user=user_response(user)
    )
    set_refresh_cookie(response, new_refresh_token)
    return result


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    db: DatabaseSession,
    refresh_token: str | None = Cookie(default=None),
) -> None:
    if refresh_token:
        stored_token = db.scalar(
            select(RefreshToken).where(
                RefreshToken.token_hash == hash_refresh_token(refresh_token)
            )
        )
        if stored_token and stored_token.revoked_at is None:
            stored_token.revoked_at = datetime.now(UTC)
            db.commit()

    response.delete_cookie(get_settings().refresh_token_cookie_name, path="/auth")


@router.get("/me", response_model=UserResponse)
def me(user: CurrentUser) -> UserResponse:
    return user_response(user)
