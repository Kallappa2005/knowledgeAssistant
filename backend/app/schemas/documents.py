from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.entities import DocumentStatus


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    original_filename: str
    mime_type: str
    file_size_bytes: int
    status: DocumentStatus
    uploaded_by_id: UUID
    approved_at: datetime | None
    created_at: datetime
    updated_at: datetime


class DocumentProcessingResponse(BaseModel):
    document: DocumentResponse
    chunk_count: int
