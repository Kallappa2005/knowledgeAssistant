from sqlalchemy import select

from app.models import entities  # noqa: F401
from app.models.base import Base
from app.database.session import engine
from app.database.session import SessionLocal
from app.models.entities import Role, UserRoleType


def create_tables() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal.begin() as db:
        for role_name in UserRoleType:
            if db.scalar(select(Role).where(Role.name == role_name)) is None:
                db.add(Role(name=role_name))


if __name__ == "__main__":
    create_tables()
    print("Database tables created successfully.")
