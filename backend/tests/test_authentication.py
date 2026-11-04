from uuid import uuid4

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_password_hashing_uses_bcrypt_and_verifies() -> None:
    hashed = hash_password("StrongPass123!")

    assert hashed.startswith("$2")
    assert verify_password("StrongPass123!", hashed)
    assert not verify_password("wrong-password", hashed)


def test_access_token_round_trip() -> None:
    user_id = uuid4()

    token = create_access_token(user_id)

    assert decode_access_token(token) == user_id


def test_register_login_and_role_protection(client) -> None:
    email = f"auth-{uuid4().hex}@example.com"
    password = "StrongPass123!"
    register = client.post(
        "/auth/register",
        json={"email": email, "full_name": "Auth Test", "password": password},
    )
    assert register.status_code == 201
    login = client.post(
        "/auth/login", json={"email": email, "password": password}
    )
    assert login.status_code == 200
    token = login.json()["access_token"]

    assert client.get(
        "/employee/ping", headers={"Authorization": f"Bearer {token}"}
    ).status_code == 200
    assert client.get(
        "/admin/ping", headers={"Authorization": f"Bearer {token}"}
    ).status_code == 403
    assert client.get(
        "/auth/me", headers={"Authorization": f"Bearer {token}"}
    ).json()["email"] == email


def test_invalid_credentials_and_token_are_rejected(client) -> None:
    email = f"invalid-{uuid4().hex}@example.com"
    client.post(
        "/auth/register",
        json={
            "email": email,
            "full_name": "Invalid Auth Test",
            "password": "StrongPass123!",
        },
    )

    invalid_login = client.post(
        "/auth/login", json={"email": email, "password": "WrongPass123!"}
    )
    invalid_token = client.get(
        "/auth/me", headers={"Authorization": "Bearer invalid.token.value"}
    )

    assert invalid_login.status_code == 401
    assert invalid_token.status_code == 401
