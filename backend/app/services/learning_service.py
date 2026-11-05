from datetime import date
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_settings
from app.models.entities import (
    CourseAssignment,
    LearningCourse,
    User,
    UserRole,
    UserRoleType,
)

PDF_CONTENT_TYPE = "application/pdf"
PDF_SIGNATURE = b"%PDF-"


def _storage_directory() -> Path:
    directory = Path(get_settings().learning_storage_dir)
    directory.mkdir(parents=True, exist_ok=True)
    return directory.resolve()


def _validate_filename(filename: str | None) -> str:
    if not filename or Path(filename).name != filename:
        raise ValueError("A valid training PDF filename is required.")
    if Path(filename).suffix.lower() != ".pdf":
        raise ValueError("Only PDF training files are supported.")
    return filename


async def store_training_pdf(upload: UploadFile) -> tuple[str, int, str]:
    filename = _validate_filename(upload.filename)
    if upload.content_type not in (None, "", PDF_CONTENT_TYPE):
        raise ValueError("The training file must have content type application/pdf.")
    destination = _storage_directory() / f"{uuid4()}.pdf"
    total_size = 0
    first_chunk = True
    try:
        with destination.open("wb") as file:
            while True:
                chunk = await upload.read(1024 * 1024)
                if not chunk:
                    break
                if first_chunk and not chunk.startswith(PDF_SIGNATURE):
                    raise ValueError("The uploaded training file is not a valid PDF.")
                first_chunk = False
                total_size += len(chunk)
                if total_size > get_settings().max_document_size_bytes:
                    raise ValueError("The training PDF exceeds the maximum allowed size.")
                file.write(chunk)
    except Exception:
        destination.unlink(missing_ok=True)
        raise
    finally:
        await upload.close()
    if total_size == 0:
        destination.unlink(missing_ok=True)
        raise ValueError("The uploaded training PDF is empty.")
    return filename, total_size, destination.name


def create_course(
    db: Session,
    admin: User,
    title: str,
    description: str,
    due_date: date,
    estimated_minutes: int,
    original_filename: str,
    file_size_bytes: int,
    stored_filename: str,
) -> LearningCourse:
    course = LearningCourse(
        title=title,
        description=description,
        due_date=due_date,
        estimated_minutes=estimated_minutes,
        original_filename=original_filename,
        stored_filename=stored_filename,
        storage_path=str((_storage_directory() / stored_filename).resolve()),
        mime_type=PDF_CONTENT_TYPE,
        file_size_bytes=file_size_bytes,
        created_by_id=admin.id,
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


def list_courses(db: Session) -> list[LearningCourse]:
    return list(
        db.scalars(
            select(LearningCourse).order_by(LearningCourse.created_at.desc())
        ).all()
    )


def delete_course(db: Session, course: LearningCourse) -> None:
    storage_path = Path(course.storage_path)
    db.delete(course)
    db.commit()
    storage_path.unlink(missing_ok=True)


def list_employee_accounts(db: Session) -> list[User]:
    return list(
        db.scalars(
            select(User)
            .join(User.user_roles)
            .join(UserRole.role)
            .where(
                UserRole.role.has(name=UserRoleType.EMPLOYEE),
                User.is_active.is_(True),
            )
            .order_by(User.full_name)
        ).unique().all()
    )


def assign_course(
    db: Session, admin: User, course: LearningCourse, employee_ids: list[UUID]
) -> list[CourseAssignment]:
    unique_employee_ids = set(employee_ids)
    employees = list(
        db.scalars(
            select(User)
            .join(User.user_roles)
            .join(UserRole.role)
            .where(
                User.id.in_(unique_employee_ids),
                UserRole.role.has(name=UserRoleType.EMPLOYEE),
                User.is_active.is_(True),
            )
        ).unique().all()
    )
    if len(employees) != len(unique_employee_ids):
        raise ValueError("One or more selected users are not active employees.")
    existing = set(
        db.scalars(
            select(CourseAssignment.employee_id).where(
                CourseAssignment.course_id == course.id,
                CourseAssignment.employee_id.in_(unique_employee_ids),
            )
        ).all()
    )
    already_assigned = [
        employee.full_name
        for employee in employees
        if employee.id in existing
    ]
    if already_assigned:
        names = ", ".join(sorted(already_assigned))
        raise ValueError(f"This course is already assigned to: {names}.")
    for employee in employees:
        db.add(
            CourseAssignment(
                course_id=course.id,
                employee_id=employee.id,
                assigned_by_id=admin.id,
            )
        )
    db.commit()
    return list_course_assignments(db)


def list_course_assignments(db: Session) -> list[CourseAssignment]:
    return list(
        db.scalars(
            select(CourseAssignment)
            .options(
                selectinload(CourseAssignment.course),
                selectinload(CourseAssignment.employee),
            )
            .order_by(CourseAssignment.created_at.desc())
        ).all()
    )
