from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.entities import EscalationStatus


class EscalationCreateRequest(BaseModel):
    question: str = Field(min_length=3, max_length=2000)


class EscalationResponseCreateRequest(BaseModel):
    response: str = Field(min_length=1, max_length=5000)


class EscalationStatusUpdateRequest(BaseModel):
    status: EscalationStatus


class EscalationResponseModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    admin_id: UUID
    response: str
    created_at: datetime


class EscalationModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    question: str
    status: EscalationStatus
    created_at: datetime
    updated_at: datetime
    responses: list[EscalationResponseModel] = Field(default_factory=list)


class AuditLogModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    actor_id: UUID | None
    action: str
    resource_type: str
    resource_id: str | None
    details: dict | None
    created_at: datetime
