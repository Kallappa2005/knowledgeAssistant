from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.entities import (
    AuditLog,
    Escalation,
    EscalationResponse,
    EscalationStatus,
    User,
)

ALLOWED_STATUS_TRANSITIONS: dict[EscalationStatus, set[EscalationStatus]] = {
    EscalationStatus.PENDING: {EscalationStatus.IN_REVIEW, EscalationStatus.CLOSED},
    EscalationStatus.IN_REVIEW: {
        EscalationStatus.RESPONDED,
        EscalationStatus.CLOSED,
    },
    EscalationStatus.RESPONDED: {EscalationStatus.CLOSED},
    EscalationStatus.CLOSED: set(),
}


def _with_responses():
    return (
        selectinload(Escalation.responses),
        selectinload(Escalation.user),
    )


def _audit(
    db: Session,
    actor_id: UUID,
    action: str,
    resource_id: UUID,
    details: dict,
) -> None:
    db.add(
        AuditLog(
            actor_id=actor_id,
            action=action,
            resource_type="escalation",
            resource_id=str(resource_id),
            details=details,
        )
    )


def create_escalation(db: Session, user: User, question: str) -> Escalation:
    escalation = Escalation(user_id=user.id, question=question)
    db.add(escalation)
    db.flush()
    _audit(db, user.id, "ESCALATION_CREATED", escalation.id, {"status": "PENDING"})
    db.commit()
    db.refresh(escalation)
    return escalation


def list_user_escalations(db: Session, user: User) -> list[Escalation]:
    return list(
        db.scalars(
            select(Escalation)
            .options(*_with_responses())
            .where(Escalation.user_id == user.id)
            .order_by(Escalation.updated_at.desc())
        ).all()
    )


def list_admin_escalations(db: Session) -> list[Escalation]:
    return list(
        db.scalars(
            select(Escalation)
            .options(*_with_responses())
            .order_by(Escalation.updated_at.desc())
        ).all()
    )


def get_owned_escalation(
    db: Session, user: User, escalation_id: UUID
) -> Escalation | None:
    return db.scalar(
        select(Escalation)
        .options(*_with_responses())
        .where(Escalation.id == escalation_id, Escalation.user_id == user.id)
    )


def get_escalation(db: Session, escalation_id: UUID) -> Escalation | None:
    return db.scalar(
        select(Escalation)
        .options(*_with_responses())
        .where(Escalation.id == escalation_id)
    )


def delete_owned_escalation(
    db: Session, user: User, escalation: Escalation
) -> None:
    if escalation.status is not EscalationStatus.CLOSED:
        raise ValueError("Only closed escalations can be deleted.")
    if escalation.user_id != user.id:
        raise ValueError("You can only delete your own escalations.")
    db.delete(escalation)
    db.commit()


def update_status(
    db: Session, admin: User, escalation: Escalation, new_status: EscalationStatus
) -> Escalation:
    if new_status not in ALLOWED_STATUS_TRANSITIONS[escalation.status]:
        raise ValueError(
            f"Cannot change escalation from {escalation.status.value} to {new_status.value}."
        )
    old_status = escalation.status
    escalation.status = new_status
    escalation.updated_at = datetime.now(UTC)
    _audit(
        db,
        admin.id,
        "ESCALATION_STATUS_UPDATED",
        escalation.id,
        {"from": old_status.value, "to": new_status.value},
    )
    if new_status is EscalationStatus.CLOSED:
        db.delete(escalation)
        db.commit()
        return escalation
    db.commit()
    db.refresh(escalation)
    return escalation


def add_response(
    db: Session, admin: User, escalation: Escalation, response_text: str
) -> Escalation:
    if escalation.status not in {
        EscalationStatus.IN_REVIEW,
        EscalationStatus.PENDING,
    }:
        raise ValueError("A response can only be added to an open escalation.")
    if escalation.status == EscalationStatus.PENDING:
        escalation.status = EscalationStatus.IN_REVIEW
    escalation_response = EscalationResponse(
        escalation_id=escalation.id,
        admin_id=admin.id,
        response=response_text,
    )
    db.add(escalation_response)
    escalation.status = EscalationStatus.RESPONDED
    escalation.updated_at = datetime.now(UTC)
    _audit(db, admin.id, "ESCALATION_RESPONDED", escalation.id, {})
    db.commit()
    db.refresh(escalation)
    return escalation


def list_audit_logs(db: Session, limit: int = 100) -> list[AuditLog]:
    return list(
        db.scalars(
            select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
        ).all()
    )
