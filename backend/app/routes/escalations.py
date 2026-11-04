from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.api_dependencies import CurrentUser, DatabaseSession, require_role
from app.models.entities import Escalation, User, UserRoleType
from app.schemas.escalations import (
    AuditLogModel,
    EscalationCreateRequest,
    EscalationModel,
    EscalationResponseCreateRequest,
    EscalationStatusUpdateRequest,
)
from app.services.escalation_service import (
    add_response,
    create_escalation,
    get_escalation,
    get_owned_escalation,
    list_admin_escalations,
    list_audit_logs,
    list_user_escalations,
    update_status,
)

employee_router = APIRouter(prefix="/escalations", tags=["escalations"])
admin_router = APIRouter(
    prefix="/admin/escalations",
    tags=["admin escalations"],
    dependencies=[Depends(require_role(UserRoleType.ADMIN))],
)


@employee_router.post(
    "",
    response_model=EscalationModel,
    status_code=status.HTTP_201_CREATED,
)
def create(
    payload: EscalationCreateRequest,
    db: DatabaseSession,
    user: CurrentUser,
) -> Escalation:
    return create_escalation(db, user, payload.question)


@employee_router.get("", response_model=list[EscalationModel])
def list_mine(db: DatabaseSession, user: CurrentUser) -> list[Escalation]:
    return list_user_escalations(db, user)


@employee_router.get("/{escalation_id}", response_model=EscalationModel)
def get_mine(
    escalation_id: UUID, db: DatabaseSession, user: CurrentUser
) -> Escalation:
    escalation = get_owned_escalation(db, user, escalation_id)
    if escalation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Escalation not found."
        )
    return escalation


@admin_router.get("", response_model=list[EscalationModel])
def inbox(db: DatabaseSession) -> list[Escalation]:
    return list_admin_escalations(db)


@admin_router.patch("/{escalation_id}/status", response_model=EscalationModel)
def change_status(
    escalation_id: UUID,
    payload: EscalationStatusUpdateRequest,
    db: DatabaseSession,
    admin: CurrentUser,
) -> Escalation:
    escalation = get_escalation(db, escalation_id)
    if escalation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Escalation not found."
        )
    try:
        return update_status(db, admin, escalation, payload.status)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(error)
        ) from error


@admin_router.post("/{escalation_id}/responses", response_model=EscalationModel)
def respond(
    escalation_id: UUID,
    payload: EscalationResponseCreateRequest,
    db: DatabaseSession,
    admin: CurrentUser,
) -> Escalation:
    escalation = get_escalation(db, escalation_id)
    if escalation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Escalation not found."
        )
    try:
        return add_response(db, admin, escalation, payload.response)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(error)
        ) from error


@admin_router.get("/audit-logs", response_model=list[AuditLogModel])
def audit_logs(db: DatabaseSession) -> list:
    return list_audit_logs(db)
