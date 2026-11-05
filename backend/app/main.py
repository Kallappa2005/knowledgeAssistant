from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import get_settings
from app.database.session import check_database_connection
from app.routes.auth import router as auth_router
from app.routes.documents import router as documents_router
from app.routes.conversations import router as conversations_router
from app.routes.escalations import admin_router as admin_escalations_router
from app.routes.escalations import employee_router as employee_escalations_router
from app.routes.protected import router as protected_router
from app.routes.rag import router as rag_router
from app.routes.learning_admin import router as learning_admin_router
from app.routes.learning_employee import router as learning_employee_router

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Backend API for the Policy / Knowledge Assistant.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(documents_router)
app.include_router(conversations_router)
app.include_router(employee_escalations_router)
app.include_router(admin_escalations_router)
app.include_router(protected_router)
app.include_router(rag_router)
app.include_router(learning_admin_router)
app.include_router(learning_employee_router)


@app.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}


@app.get("/health/database", tags=["health"])
def database_health_check() -> dict[str, str]:
    try:
        check_database_connection()
    except SQLAlchemyError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is unavailable.",
        ) from error

    return {"status": "ok", "database": "connected"}
