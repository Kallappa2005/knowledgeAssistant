from datetime import UTC, datetime
from pathlib import Path
import re
from uuid import UUID

from fastapi import APIRouter, HTTPException, Response, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api_dependencies import CurrentUser, DatabaseSession
from app.models.entities import (
    CourseAssignment,
    LearningAssignmentStatus,
    LearningQuizAttempt,
)
from app.schemas.learning import (
    CourseAssignmentResponse,
    LearningCompletionRequest,
    LearningQuizResult,
    LearningQuizResponse,
    LearningQuizSubmitRequest,
    LearningQuizQuestion,
    LearningSummaryResponse,
)
from app.services.learning_ai_service import (
    generate_quiz,
    generate_summary,
    learning_ai_error,
)

router = APIRouter(prefix="/learning", tags=["employee learning"])


def _normalise_answer(value: str) -> str:
    value = re.sub(r"[^a-z0-9\s]", " ", value.casefold())
    words = re.sub(r"\s+", " ", value).strip().split()
    irregular = {
        "creates": "create",
        "creating": "create",
        "created": "create",
        "generates": "generate",
        "generating": "generate",
        "generated": "generate",
        "classifies": "classify",
        "classifying": "classify",
    }
    return " ".join(irregular.get(word, word) for word in words)


def _answers_match(submitted: str, expected: str | list[str]) -> bool:
    expected_answers = [expected] if isinstance(expected, str) else expected
    return any(
        _single_answer_match(submitted, candidate)
        for candidate in expected_answers
    )


def _single_answer_match(submitted: str, expected: str) -> bool:
    submitted_normalised = _normalise_answer(submitted)
    expected_normalised = _normalise_answer(expected)
    if not submitted_normalised or not expected_normalised:
        return False
    if submitted_normalised == expected_normalised:
        return True
    ignored_words = {"a", "an", "the", "and", "of", "to", "in", "is", "are", "for", "as", "on", "with"}
    submitted_words = set(submitted_normalised.split()) - ignored_words
    expected_words = set(expected_normalised.split()) - ignored_words
    return (
        expected_normalised in submitted_normalised
        or submitted_normalised in expected_normalised
        or (
            len(expected_words) > 1
            and (
                expected_words.issubset(submitted_words)
                if len(expected_words) <= 3
                else False
            )
        )
        or (
            len(expected_words) > 3
            and len(submitted_words) > 1
            and len(expected_words & submitted_words) / len(expected_words) >= 0.6
            and len(expected_words & submitted_words) / len(submitted_words) >= 0.6
        )
    )


def _owned_assignment(
    db: Session, user_id: UUID, assignment_id: UUID
) -> CourseAssignment | None:
    return db.scalar(
        select(CourseAssignment)
        .options(
            selectinload(CourseAssignment.course),
            selectinload(CourseAssignment.employee),
            selectinload(CourseAssignment.quiz_attempts),
        )
        .where(
            CourseAssignment.id == assignment_id,
            CourseAssignment.employee_id == user_id,
        )
    )


def _mark_in_progress(db: Session, assignment: CourseAssignment) -> None:
    if assignment.status == LearningAssignmentStatus.NOT_STARTED:
        assignment.status = LearningAssignmentStatus.IN_PROGRESS
        assignment.updated_at = datetime.now(UTC)
        db.commit()


@router.get("/my-courses", response_model=list[CourseAssignmentResponse])
def my_courses(db: DatabaseSession, user: CurrentUser) -> list[CourseAssignment]:
    return list(
        db.scalars(
            select(CourseAssignment)
            .options(
                selectinload(CourseAssignment.course),
                selectinload(CourseAssignment.employee),
            )
            .where(CourseAssignment.employee_id == user.id)
            .order_by(CourseAssignment.created_at.desc())
        ).all()
    )


@router.get("/assignments/{assignment_id}/document")
def training_document(
    assignment_id: UUID, db: DatabaseSession, user: CurrentUser
) -> FileResponse:
    assignment = _owned_assignment(db, user.id, assignment_id)
    if assignment is None:
        raise HTTPException(status_code=404, detail="Learning assignment not found.")
    path = Path(assignment.course.storage_path)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Training document not found.")
    _mark_in_progress(db, assignment)
    return FileResponse(
        path,
        media_type="application/pdf",
        filename=assignment.course.original_filename,
    )


@router.post(
    "/assignments/{assignment_id}/summary",
    response_model=LearningSummaryResponse,
)
def summary(
    assignment_id: UUID, db: DatabaseSession, user: CurrentUser
) -> LearningSummaryResponse:
    assignment = _owned_assignment(db, user.id, assignment_id)
    if assignment is None:
        raise HTTPException(status_code=404, detail="Learning assignment not found.")
    _mark_in_progress(db, assignment)
    try:
        return LearningSummaryResponse(
            summary=generate_summary(assignment.course.storage_path)
        )
    except Exception as error:
        raise HTTPException(
            status_code=503, detail=learning_ai_error(error)
        ) from error


@router.post(
    "/assignments/{assignment_id}/quiz",
    response_model=LearningQuizResponse,
)
def quiz(
    assignment_id: UUID, db: DatabaseSession, user: CurrentUser
) -> LearningQuizResponse:
    assignment = _owned_assignment(db, user.id, assignment_id)
    if assignment is None:
        raise HTTPException(status_code=404, detail="Learning assignment not found.")
    _mark_in_progress(db, assignment)
    try:
        questions = generate_quiz(assignment.course.storage_path)
    except Exception as error:
        raise HTTPException(
            status_code=503, detail=learning_ai_error(error)
        ) from error
    attempt = LearningQuizAttempt(assignment_id=assignment.id, questions=questions)
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return LearningQuizResponse(
        attempt_id=attempt.id,
        questions=[
            LearningQuizQuestion(id=item["id"], question=item["question"])
            for item in questions
        ],
    )


@router.post(
    "/assignments/{assignment_id}/quiz/{attempt_id}/submit",
    response_model=LearningQuizResult,
)
def submit_quiz(
    assignment_id: UUID,
    attempt_id: UUID,
    payload: LearningQuizSubmitRequest,
    db: DatabaseSession,
    user: CurrentUser,
) -> LearningQuizResult:
    assignment = _owned_assignment(db, user.id, assignment_id)
    attempt = db.scalar(
        select(LearningQuizAttempt)
        .where(
            LearningQuizAttempt.id == attempt_id,
            LearningQuizAttempt.assignment_id == assignment_id,
        )
        .with_for_update()
    )
    if assignment is None or attempt is None:
        raise HTTPException(status_code=404, detail="Knowledge-check attempt not found.")
    if attempt.submitted_at is not None:
        expected = {item["id"]: item for item in attempt.questions}
        submitted_answers = {
            item["question_id"]: item["answer"] for item in (attempt.answers or [])
        }
        return LearningQuizResult(
            attempt_id=attempt.id,
            score=attempt.score or 0,
            correct_answers=sum(
                _answers_match(
                    submitted_answers.get(question_id, ""),
                    [item["answer"], *item.get("accepted_answers", [])],
                )
                for question_id, item in expected.items()
            ),
            total_questions=len(expected),
            explanations=[item["explanation"] for item in expected.values()],
        )
    expected = {item["id"]: item for item in attempt.questions}
    if set(item.question_id for item in payload.answers) != set(expected):
        raise HTTPException(status_code=400, detail="Answers must include all three questions.")
    correct = 0
    explanations: list[str] = []
    for answer in payload.answers:
        item = expected[answer.question_id]
        is_correct = _answers_match(
            answer.answer,
            [item["answer"], *item.get("accepted_answers", [])],
        )
        correct += int(is_correct)
        explanations.append(item["explanation"])
    score = round(correct / len(expected) * 100)
    attempt.answers = [item.model_dump() for item in payload.answers]
    attempt.score = score
    attempt.submitted_at = datetime.now(UTC)
    assignment.knowledge_check_score = score
    db.commit()
    return LearningQuizResult(
        attempt_id=attempt.id,
        score=score,
        correct_answers=correct,
        total_questions=len(expected),
        explanations=explanations,
    )


@router.post(
    "/assignments/{assignment_id}/complete",
    response_model=CourseAssignmentResponse,
)
def complete(
    assignment_id: UUID,
    payload: LearningCompletionRequest,
    db: DatabaseSession,
    user: CurrentUser,
) -> CourseAssignment:
    if not payload.confirm:
        raise HTTPException(status_code=400, detail="Completion confirmation is required.")
    assignment = _owned_assignment(db, user.id, assignment_id)
    if assignment is None:
        raise HTTPException(status_code=404, detail="Learning assignment not found.")
    assignment.status = LearningAssignmentStatus.COMPLETION_REPORTED
    assignment.completion_declaration = True
    assignment.completion_date = datetime.now(UTC)
    assignment.updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(assignment)
    return _owned_assignment(db, user.id, assignment_id)
