from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.api_dependencies import CurrentUser, DatabaseSession, require_role
from app.models.entities import LearningCourse, UserRoleType
from app.schemas.learning import (
    CourseAssignmentCreateRequest,
    CourseAssignmentResponse,
    EmployeeSummary,
    LearningCourseResponse,
    LearningCourseDeleteResponse,
)
from app.services.learning_service import (
    assign_course,
    create_course,
    list_course_assignments,
    list_courses,
    list_employee_accounts,
    store_training_pdf,
    delete_course,
)

router = APIRouter(
    prefix="/admin/learning",
    tags=["admin learning"],
    dependencies=[Depends(require_role(UserRoleType.ADMIN))],
)


@router.post(
    "/courses",
    response_model=LearningCourseResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_course(
    db: DatabaseSession,
    admin: CurrentUser,
    title: str = Form(..., min_length=1, max_length=200),
    description: str = Form(..., min_length=1, max_length=5000),
    due_date: date = Form(...),
    estimated_minutes: int = Form(..., ge=1, le=1440),
    file: UploadFile = File(...),
) -> LearningCourse:
    try:
        original_filename, file_size, stored_filename = await store_training_pdf(file)
        return create_course(
            db,
            admin,
            title.strip(),
            description.strip(),
            due_date,
            estimated_minutes,
            original_filename,
            file_size,
            stored_filename,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)
        ) from error


@router.get("/courses", response_model=list[LearningCourseResponse])
def get_courses(db: DatabaseSession) -> list[LearningCourse]:
    return list_courses(db)


@router.delete(
    "/courses/{course_id}",
    response_model=LearningCourseDeleteResponse,
)
def remove_course(
    course_id: UUID,
    db: DatabaseSession,
    admin: CurrentUser,
) -> LearningCourseDeleteResponse:
    course = db.get(LearningCourse, course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="Learning course not found.")
    if course.created_by_id != admin.id:
        raise HTTPException(status_code=403, detail="You can delete only courses you created.")
    delete_course(db, course)
    return LearningCourseDeleteResponse(message="Learning course deleted.")


@router.get("/employees", response_model=list[EmployeeSummary])
def get_employees(db: DatabaseSession) -> list:
    return list_employee_accounts(db)


@router.post(
    "/courses/{course_id}/assign",
    response_model=list[CourseAssignmentResponse],
)
def assign(
    course_id: UUID,
    payload: CourseAssignmentCreateRequest,
    db: DatabaseSession,
    admin: CurrentUser,
) -> list:
    course = db.get(LearningCourse, course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="Learning course not found.")
    try:
        return assign_course(db, admin, course, payload.employee_ids)
    except ValueError as error:
        message = str(error)
        error_status = (
            status.HTTP_409_CONFLICT
            if message.startswith("This course is already assigned")
            else status.HTTP_400_BAD_REQUEST
        )
        raise HTTPException(status_code=error_status, detail=message) from error


@router.get("/assignments", response_model=list[CourseAssignmentResponse])
def get_assignments(db: DatabaseSession) -> list:
    return list_course_assignments(db)
