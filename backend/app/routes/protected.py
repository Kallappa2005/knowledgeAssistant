from fastapi import APIRouter, Depends

from app.api_dependencies import require_role
from app.models.entities import User, UserRoleType

router = APIRouter(tags=["authorization"])


@router.get("/employee/ping")
def employee_ping(
    user: User = Depends(require_role(UserRoleType.EMPLOYEE)),
) -> dict[str, str]:
    return {"message": "Employee access granted.", "user_id": str(user.id)}


@router.get("/admin/ping")
def admin_ping(
    user: User = Depends(require_role(UserRoleType.ADMIN)),
) -> dict[str, str]:
    return {"message": "Administrator access granted.", "user_id": str(user.id)}
