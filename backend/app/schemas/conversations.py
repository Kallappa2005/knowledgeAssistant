from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.entities import MessageRole
from app.schemas.rag import RagCitation


class ConversationCreateRequest(BaseModel):
    title: str | None = Field(default=None, max_length=200)


class QuestionRequest(BaseModel):
    question: str = Field(min_length=3, max_length=2000)


class MessageResponse(BaseModel):
    id: UUID
    role: MessageRole
    content: str
    uncertainty: str | None
    created_at: datetime
    citations: list[RagCitation] = Field(default_factory=list)


class ConversationSummary(BaseModel):
    id: UUID
    title: str | None
    created_at: datetime
    updated_at: datetime


class ConversationResponse(ConversationSummary):
    messages: list[MessageResponse]
