from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import or_, select

from app.database.session import SessionLocal
from app.main import app
from app.models.entities import User


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def database_session():
    with SessionLocal() as session:
        yield session


@pytest.fixture
def cleanup_users() -> Generator[list[User], None, None]:
    users: list[User] = []
    yield users
    with SessionLocal.begin() as session:
        for user in users:
            persisted = session.get(User, user.id)
            if persisted is not None:
                session.delete(persisted)


@pytest.fixture(scope="session", autouse=True)
def remove_test_records() -> Generator[None, None, None]:
    yield
    with SessionLocal.begin() as session:
        users = session.scalars(
            select(User).where(
                or_(
                    User.email.like("auth-%@example.com"),
                    User.email.like("invalid-%@example.com"),
                    User.email.like("owner-a-%@example.com"),
                    User.email.like("owner-b-%@example.com"),
                )
            )
        ).all()
        for user in users:
            session.delete(user)
