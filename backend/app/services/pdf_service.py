from dataclasses import dataclass
from pathlib import Path

from pypdf import PdfReader


@dataclass(frozen=True)
class ExtractedPage:
    page_number: int
    text: str


def extract_pdf_pages(storage_path: str) -> list[ExtractedPage]:
    path = Path(storage_path).resolve()
    if not path.is_file():
        raise FileNotFoundError("The stored PDF file does not exist.")

    reader = PdfReader(str(path))
    pages: list[ExtractedPage] = []
    for page_number, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").replace("\x00", "").strip()
        if text:
            pages.append(ExtractedPage(page_number=page_number, text=text))
    if not pages:
        raise ValueError("The PDF does not contain extractable text.")
    return pages
