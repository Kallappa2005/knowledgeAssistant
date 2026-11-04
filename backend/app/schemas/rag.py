from pydantic import BaseModel, Field
from uuid import UUID


class RagQueryRequest(BaseModel):
    question: str = Field(min_length=3, max_length=2000)


class RagCitation(BaseModel):
    chunk_id: str
    document_id: UUID
    document_name: str
    page_number: int | None
    section_name: str | None
    excerpt: str
    distance: float


class RagAnswerResponse(BaseModel):
    answer: str
    citations: list[RagCitation]
    uncertain: bool
    escalation_recommended: bool
    reason: str | None = None
