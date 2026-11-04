from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    refresh_token_expiry,
    verify_password,
)
from app.models.entities import RefreshToken, Role, User, UserRole, UserRoleType
from app.schemas.auth import AuthResponse, UserResponse


def get_role(db: Session, role_name: UserRoleType) -> Role:
    role = db.scalar(select(Role).where(Role.name == role_name))
    if role is None:
        role = Role(name=role_name)
        db.add(role)
        db.flush()
    return role


def user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        roles=[user_role.role.name for user_role in user.user_roles],
    )


def create_employee(db: Session, email: str, full_name: str, password: str) -> User:
    existing_user = db.scalar(select(User).where(User.email == email))
    if existing_user is not None:
        raise ValueError("An account with this email already exists.")

    user = User(
        email=email,
        full_name=full_name,
        password_hash=hash_password(password),
    )
    user_role = UserRole(user=user, role=get_role(db, UserRoleType.EMPLOYEE))
    db.add_all([user, user_role])
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(password, user.password_hash):
        return None
    if not user.is_active:
        return None
    return user


def issue_tokens(db: Session, user: User) -> tuple[str, str]:
    raw_refresh_token = generate_refresh_token()
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_refresh_token(raw_refresh_token),
            expires_at=refresh_token_expiry(),
        )
    )
    db.commit()
    return create_access_token(user.id), raw_refresh_token


def auth_response(db: Session, user: User) -> tuple[AuthResponse, str]:
    access_token, refresh_token = issue_tokens(db, user)
    return (
        AuthResponse(access_token=access_token, user=user_response(user)),
        refresh_token,
    )
