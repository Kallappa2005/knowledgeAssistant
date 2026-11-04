from uuid import uuid4

from app.services.rag_service import RetrievedEvidence, _validate_llm_result


def test_valid_llm_citation_is_returned() -> None:
    evidence = [
        RetrievedEvidence(
            chunk_id="document:0",
            document_id=uuid4(),
            document_name="leave.pdf",
            page_number=2,
            section_name=None,
            excerpt="Employees receive twenty days.",
            distance=0.2,
        )
    ]

    result = _validate_llm_result(
        {
            "supported": True,
            "answer": "Employees receive twenty days.",
            "citation_chunk_ids": ["document:0"],
        },
        evidence,
    )

    assert not result.uncertain
    assert result.citations[0].page_number == 2


def test_unknown_citation_forces_uncertainty() -> None:
    evidence = [
        RetrievedEvidence(
            chunk_id="document:0",
            document_id=uuid4(),
            document_name="leave.pdf",
            page_number=2,
            section_name=None,
            excerpt="Employees receive twenty days.",
            distance=0.2,
        )
    ]

    result = _validate_llm_result(
        {
            "supported": True,
            "answer": "Unsupported answer.",
            "citation_chunk_ids": ["not-retrieved"],
        },
        evidence,
    )

    assert result.uncertain
    assert result.escalation_recommended
    assert result.citations == []
