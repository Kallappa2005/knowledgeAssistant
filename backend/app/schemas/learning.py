from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.entities import LearningAssignmentStatus


class EmployeeSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    email: str


class LearningCourseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    description: str
    original_filename: str
    file_size_bytes: int
    due_date: date
    estimated_minutes: int
    created_by_id: UUID
    created_at: datetime
    updated_at: datetime


class LearningCourseDeleteResponse(BaseModel):
    message: str


class CourseAssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    course_id: UUID
    employee_id: UUID
    assigned_by_id: UUID
    status: LearningAssignmentStatus
    completion_date: datetime | None
    knowledge_check_score: int | None
    completion_declaration: bool
    created_at: datetime
    updated_at: datetime
    course: LearningCourseResponse
    employee: EmployeeSummary


class CourseAssignmentCreateRequest(BaseModel):
    employee_ids: list[UUID] = Field(min_length=1, max_length=500)


class LearningSummaryResponse(BaseModel):
    summary: str


class LearningQuizQuestion(BaseModel):
    id: str
    question: str


class LearningQuizResponse(BaseModel):
    attempt_id: UUID
    questions: list[LearningQuizQuestion]


class LearningQuizAnswer(BaseModel):
    question_id: str
    answer: str = Field(max_length=2000)


class LearningQuizSubmitRequest(BaseModel):
    answers: list[LearningQuizAnswer] = Field(min_length=3, max_length=3)


class LearningQuizResult(BaseModel):
    attempt_id: UUID
    score: int
    correct_answers: int
    total_questions: int
    explanations: list[str]


class LearningCompletionRequest(BaseModel):
    confirm: bool
