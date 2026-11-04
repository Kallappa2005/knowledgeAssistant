from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.api_dependencies import CurrentUser, DatabaseSession, require_role
from app.models.entities import Document, DocumentStatus, User, UserRoleType
from app.schemas.documents import DocumentProcessingResponse, DocumentResponse
from app.services.document_service import (
    create_document,
    list_documents,
    set_document_status,
    store_pdf,
)
from app.services.processing_service import deactivate_document_index, process_document

router = APIRouter(
    prefix="/admin/documents",
    tags=["document management"],
    dependencies=[Depends(require_role(UserRoleType.ADMIN))],
)


@router.post(
    "",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    db: DatabaseSession,
    admin: CurrentUser,
    file: UploadFile = File(...),
) -> Document:
    try:
        original_filename = file.filename or ""
        stored_filename, file_size = await store_pdf(file)
        return create_document(
            db,
            admin,
            original_filename,
            stored_filename,
            file_size,
            file.content_type or "application/pdf",
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)
        ) from error


@router.get("", response_model=list[DocumentResponse])
def get_documents(
    db: DatabaseSession,
    status_filter: DocumentStatus | None = None,
) -> list[Document]:
    return list_documents(db, status_filter)


@router.patch("/{document_id}/approve", response_model=DocumentResponse)
def approve_document(document_id: UUID, db: DatabaseSession) -> Document:
    document = set_document_status(db, document_id, DocumentStatus.APPROVED)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    return document


@router.patch("/{document_id}/deactivate", response_model=DocumentResponse)
def deactivate_document(document_id: UUID, db: DatabaseSession) -> Document:
    document = deactivate_document_index(db, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    return document


@router.post("/{document_id}/process", response_model=DocumentProcessingResponse)
def process_uploaded_document(
    document_id: UUID, db: DatabaseSession
) -> DocumentProcessingResponse:
    try:
        document, chunk_count = process_document(db, document_id)
    except LookupError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(error)
        ) from error
    except (FileNotFoundError, ValueError, OSError, RuntimeError) as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)
        ) from error
    return DocumentProcessingResponse(document=document, chunk_count=chunk_count)
