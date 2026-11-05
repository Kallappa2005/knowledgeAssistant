from uuid import uuid4

from app.services.rag_service import (
    RetrievedEvidence,
    _is_casual_message,
    _evidence_payload,
    _validate_llm_result,
)


def test_common_greetings_are_classified_as_conversational() -> None:
    assert _is_casual_message("Hi hello")
    assert _is_casual_message("Good morning!")
    assert _is_casual_message("How are you?")
    assert not _is_casual_message("What does at-will employment mean?")


def test_conversational_llm_response_does_not_require_citations() -> None:
    result = _validate_llm_result(
        {
            "response_type": "conversational",
            "supported": True,
            "answer": "Hello! How can I help with a workplace policy today?",
            "citation_chunk_ids": [],
        },
        [],
    )

    assert not result.uncertain
    assert not result.escalation_recommended
    assert result.citations == []


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


def test_evidence_payload_serializes_uuid_for_llm_prompt() -> None:
    document_id = uuid4()
    payload = _evidence_payload(
        [
            RetrievedEvidence(
                chunk_id="document:0",
                document_id=document_id,
                document_name="leave.pdf",
                page_number=2,
                section_name=None,
                excerpt="Employees receive twenty days.",
                distance=0.2,
            )
        ]
    )

    assert payload[0]["document_id"] == str(document_id)


def test_citation_excerpt_is_compact() -> None:
    evidence = [
        RetrievedEvidence(
            chunk_id="document:0",
            document_id=uuid4(),
            document_name="leave.pdf",
            page_number=2,
            section_name=None,
            excerpt="First sentence is relevant. Second sentence adds context. " + "Unrelated text. " * 100,
            distance=0.2,
        )
    ]

    result = _validate_llm_result(
        {
            "supported": True,
            "answer": "Employees receive leave.",
            "citation_chunk_ids": ["document:0"],
        },
        evidence,
    )

    assert len(result.citations[0].excerpt) <= 600
    assert "First sentence is relevant." in result.citations[0].excerpt
