from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.entities import Document, DocumentStatus, User

PDF_CONTENT_TYPE = "application/pdf"
PDF_SIGNATURE = b"%PDF-"


def _storage_directory() -> Path:
    directory = Path(get_settings().document_storage_dir)
    directory.mkdir(parents=True, exist_ok=True)
    return directory.resolve()


def _validate_filename(filename: str | None) -> str:
    if not filename or Path(filename).name != filename:
        raise ValueError("A valid PDF filename is required.")
    if Path(filename).suffix.lower() != ".pdf":
        raise ValueError("Only PDF files are supported.")
    return filename


def _validate_content_type(content_type: str | None) -> None:
    if content_type not in (None, "", PDF_CONTENT_TYPE):
        raise ValueError("The uploaded file must have content type application/pdf.")


async def store_pdf(upload: UploadFile) -> tuple[str, int]:
    filename = _validate_filename(upload.filename)
    _validate_content_type(upload.content_type)
    settings = get_settings()
    storage_directory = _storage_directory()
    stored_filename = f"{uuid4()}.pdf"
    destination = storage_directory / stored_filename
    total_size = 0
    first_chunk = True

    try:
        with destination.open("wb") as file:
            while True:
                chunk = await upload.read(1024 * 1024)
                if not chunk:
                    break
                if first_chunk and not chunk.startswith(PDF_SIGNATURE):
                    raise ValueError("The uploaded file is not a valid PDF.")
                first_chunk = False
                total_size += len(chunk)
                if total_size > settings.max_document_size_bytes:
                    raise ValueError("The PDF file exceeds the maximum allowed size.")
                file.write(chunk)
    except Exception:
        destination.unlink(missing_ok=True)
        raise
    finally:
        await upload.close()

    if total_size == 0:
        destination.unlink(missing_ok=True)
        raise ValueError("The uploaded PDF file is empty.")

    return stored_filename, total_size


def create_document(
    db: Session,
    user: User,
    original_filename: str,
    stored_filename: str,
    file_size_bytes: int,
    mime_type: str,
) -> Document:
    storage_path = str((_storage_directory() / stored_filename).resolve())
    document = Document(
        original_filename=original_filename,
        stored_filename=stored_filename,
        storage_path=storage_path,
        mime_type=mime_type or PDF_CONTENT_TYPE,
        file_size_bytes=file_size_bytes,
        uploaded_by_id=user.id,
        status=DocumentStatus.PENDING,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


def list_documents(
    db: Session, status_filter: DocumentStatus | None = None
) -> list[Document]:
    query = select(Document).order_by(Document.created_at.desc())
    if status_filter is not None:
        query = query.where(Document.status == status_filter)
    return list(db.scalars(query).all())


def set_document_status(
    db: Session, document_id: UUID, status: DocumentStatus
) -> Document | None:
    document = db.get(Document, document_id)
    if document is None:
        return None
    document.status = status
    document.approved_at = (
        datetime.now(UTC) if status == DocumentStatus.APPROVED else None
    )
    db.commit()
    db.refresh(document)
    return document
