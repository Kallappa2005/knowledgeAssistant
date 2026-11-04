from uuid import UUID

from sqlalchemy.orm import Session

from app.models.entities import Document, DocumentStatus
from app.services.chunking_service import chunk_pages
from app.services.pdf_service import extract_pdf_pages
from app.services.vector_service import (
    delete_document_chunks,
    replace_document_chunks,
)


def process_document(db: Session, document_id: UUID) -> tuple[Document, int]:
    document = db.get(Document, document_id)
    if document is None:
        raise LookupError("Document not found.")
    if document.status != DocumentStatus.APPROVED:
        raise ValueError("Only approved documents can be processed.")

    document.status = DocumentStatus.PROCESSING
    db.commit()
    try:
        pages = extract_pdf_pages(document.storage_path)
        chunks = chunk_pages(str(document.id), pages)
        chunk_count = replace_document_chunks(
            str(document.id), document.original_filename, chunks
        )
    except (FileNotFoundError, ValueError, OSError, RuntimeError):
        document.status = DocumentStatus.FAILED
        db.commit()
        raise

    document.status = DocumentStatus.APPROVED
    db.commit()
    db.refresh(document)
    return document, chunk_count


def deactivate_document_index(db: Session, document_id: UUID) -> Document | None:
    document = db.get(Document, document_id)
    if document is None:
        return None
    delete_document_chunks(str(document.id))
    document.status = DocumentStatus.DEACTIVATED
    document.approved_at = None
    db.commit()
    db.refresh(document)
    return document
