from uuid import uuid4

import pytest

from app.models.entities import EscalationStatus
from app.services.escalation_service import ALLOWED_STATUS_TRANSITIONS


def test_escalation_status_transitions_are_terminal_aware() -> None:
    assert EscalationStatus.IN_REVIEW in ALLOWED_STATUS_TRANSITIONS[
        EscalationStatus.PENDING
    ]
    assert EscalationStatus.RESPONDED in ALLOWED_STATUS_TRANSITIONS[
        EscalationStatus.IN_REVIEW
    ]
    assert ALLOWED_STATUS_TRANSITIONS[EscalationStatus.CLOSED] == set()


def test_employee_escalations_are_owner_scoped(client) -> None:
    email_a = f"owner-a-{uuid4().hex}@example.com"
    email_b = f"owner-b-{uuid4().hex}@example.com"
    password = "StrongPass123!"
    for email, name in ((email_a, "Owner A"), (email_b, "Owner B")):
        response = client.post(
            "/auth/register",
            json={"email": email, "full_name": name, "password": password},
        )
        assert response.status_code == 201

    login_a = client.post(
        "/auth/login", json={"email": email_a, "password": password}
    ).json()
    login_b = client.post(
        "/auth/login", json={"email": email_b, "password": password}
    ).json()
    token_a = login_a["access_token"]
    token_b = login_b["access_token"]

    created = client.post(
        "/escalations",
        json={"question": "What is the reimbursement policy?"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    escalation_id = created.json()["id"]

    own = client.get(
        f"/escalations/{escalation_id}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    other = client.get(
        f"/escalations/{escalation_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )

    assert created.status_code == 201
    assert own.status_code == 200
    assert other.status_code == 404
