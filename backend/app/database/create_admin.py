import argparse
import getpass

from sqlalchemy import select

from app.core.security import hash_password
from app.database.session import SessionLocal
from app.models.entities import Role, User, UserRole, UserRoleType


def create_admin(email: str, full_name: str, password: str) -> None:
    with SessionLocal.begin() as db:
        if db.scalar(select(User).where(User.email == email.lower())) is not None:
            raise ValueError("An account with this email already exists.")

        role = db.scalar(select(Role).where(Role.name == UserRoleType.ADMIN))
        if role is None:
            role = Role(name=UserRoleType.ADMIN)
            db.add(role)
            db.flush()

        user = User(
            email=email.lower(),
            full_name=full_name,
            password_hash=hash_password(password),
        )
        db.add(user)
        db.flush()
        db.add(UserRole(user_id=user.id, role_id=role.id))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Provision an administrator account.")
    parser.add_argument("--email", required=True)
    parser.add_argument("--full-name", required=True)
    args = parser.parse_args()
    password = getpass.getpass("Administrator password: ")
    if len(password) < 8:
        raise SystemExit("Password must contain at least 8 characters.")
    create_admin(args.email, args.full_name, password)
    print("Administrator account created successfully.")
