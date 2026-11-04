from dataclasses import dataclass

from app.core.config import get_settings
from app.services.pdf_service import ExtractedPage


@dataclass(frozen=True)
class DocumentChunk:
    chunk_id: str
    text: str
    page_number: int
    section_name: str | None


def _chunks_for_page(page: ExtractedPage) -> list[str]:
    settings = get_settings()
    words = page.text.split()
    if not words:
        return []
    chunks: list[str] = []
    start = 0
    while start < len(words):
        end = min(start + settings.chunk_size, len(words))
        chunks.append(" ".join(words[start:end]))
        if end == len(words):
            break
        start = max(end - settings.chunk_overlap, start + 1)
    return chunks


def chunk_pages(document_id: str, pages: list[ExtractedPage]) -> list[DocumentChunk]:
    chunks: list[DocumentChunk] = []
    sequence = 0
    for page in pages:
        for text in _chunks_for_page(page):
            chunks.append(
                DocumentChunk(
                    chunk_id=f"{document_id}:{sequence}",
                    text=text,
                    page_number=page.page_number,
                    section_name=None,
                )
            )
            sequence += 1
    if not chunks:
        raise ValueError("The PDF produced no usable text chunks.")
    return chunks
