import io

import pytest
from fastapi import UploadFile

from app.services import document_service
from app.services.document_service import store_pdf


@pytest.mark.anyio
async def test_valid_pdf_is_stored(tmp_path, monkeypatch) -> None:
    monkeypatch.setattr(
        document_service, "_storage_directory", lambda: tmp_path.resolve()
    )
    upload = UploadFile(
        file=io.BytesIO(b"%PDF-1.7\nvalid"),
        filename="policy.pdf",
        headers={"content-type": "application/pdf"},
    )

    stored_filename, file_size = await store_pdf(upload)

    assert stored_filename.endswith(".pdf")
    assert file_size == len(b"%PDF-1.7\nvalid")
    assert (tmp_path / stored_filename).read_bytes().startswith(b"%PDF-")


@pytest.mark.anyio
async def test_non_pdf_and_traversal_names_are_rejected() -> None:
    with pytest.raises(ValueError, match="Only PDF"):
        await store_pdf(
            UploadFile(
                file=io.BytesIO(b"%PDF-1.7"),
                filename="policy.txt",
                headers={"content-type": "application/pdf"},
            )
        )
    with pytest.raises(ValueError, match="valid PDF filename"):
        await store_pdf(
            UploadFile(
                file=io.BytesIO(b"%PDF-1.7"),
                filename="../policy.pdf",
                headers={"content-type": "application/pdf"},
            )
        )
