import json
from dataclasses import dataclass
from typing import Any
from uuid import UUID

from groq import APIConnectionError, APIError, APITimeoutError, RateLimitError
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.exceptions import OutputParserException
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq

from app.core.config import get_settings
from app.schemas.rag import RagAnswerResponse, RagCitation
from app.services.vector_service import query_approved_chunks


@dataclass(frozen=True)
class RetrievedEvidence:
    chunk_id: str
    document_id: UUID
    document_name: str
    page_number: int | None
    section_name: str | None
    excerpt: str
    distance: float


def retrieve_evidence(question: str) -> list[RetrievedEvidence]:
    settings = get_settings()
    result = query_approved_chunks(question, limit=settings.rag_top_k)
    documents = result.get("documents") or [[]]
    metadatas = result.get("metadatas") or [[]]
    distances = result.get("distances") or [[]]
    evidence: list[RetrievedEvidence] = []
    for excerpt, metadata, distance in zip(
        documents[0], metadatas[0], distances[0], strict=False
    ):
        if not metadata or distance is None or distance > settings.rag_max_distance:
            continue
        try:
            document_id = UUID(str(metadata["document_id"]))
        except (KeyError, ValueError):
            continue
        evidence.append(
            RetrievedEvidence(
                chunk_id=str(metadata["chunk_id"]),
                document_id=document_id,
                document_name=str(metadata["document_name"]),
                page_number=metadata.get("page_number"),
                section_name=metadata.get("section_name") or None,
                excerpt=str(excerpt),
                distance=float(distance),
            )
        )
    return evidence


def _uncertain_response(reason: str) -> RagAnswerResponse:
    return RagAnswerResponse(
        answer="I could not find sufficient evidence in the approved policy documents to answer this question.",
        citations=[],
        uncertain=True,
        escalation_recommended=True,
        reason=reason,
    )


def _prompt() -> ChatPromptTemplate:
    return ChatPromptTemplate.from_messages(
        [
            (
                "system",
                """You answer employee policy questions using only the supplied evidence.
If the evidence does not support an answer, set supported to false.
Never infer or use general knowledge. Return valid JSON only:
{{"supported": boolean, "answer": string, "citation_chunk_ids": [string]}}.
Every citation_chunk_id must exactly match an evidence chunk_id.""",
            ),
            (
                "human",
                "Question: {question}\n\nApproved evidence:\n{evidence}",
            ),
        ]
    )


def _validate_llm_result(
    result: dict[str, Any], evidence: list[RetrievedEvidence]
) -> RagAnswerResponse:
    by_id = {item.chunk_id: item for item in evidence}
    supported = result.get("supported") is True
    answer = result.get("answer")
    citation_ids = result.get("citation_chunk_ids")
    if (
        not supported
        or not isinstance(answer, str)
        or not answer.strip()
        or not isinstance(citation_ids, list)
        or not citation_ids
        or any(not isinstance(item, str) or item not in by_id for item in citation_ids)
    ):
        return _uncertain_response("The generated answer failed grounding validation.")

    citations = [
        RagCitation(
            chunk_id=item.chunk_id,
            document_id=item.document_id,
            document_name=item.document_name,
            page_number=item.page_number,
            section_name=item.section_name,
            excerpt=item.excerpt,
            distance=item.distance,
        )
        for item in (by_id[citation_id] for citation_id in citation_ids)
    ]
    return RagAnswerResponse(
        answer=answer.strip(),
        citations=citations,
        uncertain=False,
        escalation_recommended=False,
    )


def answer_question(question: str) -> RagAnswerResponse:
    settings = get_settings()
    evidence = retrieve_evidence(question)
    if not evidence:
        return _uncertain_response("No approved evidence met the retrieval threshold.")
    if not settings.groq_api_key:
        return _uncertain_response("Groq API credentials are not configured.")

    try:
        model = ChatGroq(
            api_key=settings.groq_api_key,
            model=settings.groq_model,
            temperature=0,
            max_retries=1,
        )
        raw_result = (_prompt() | model | JsonOutputParser()).invoke(
            {
                "question": question,
                "evidence": json.dumps(
                    [item.__dict__ for item in evidence], ensure_ascii=True
                ),
            }
        )
    except (
        APIConnectionError,
        APIError,
        APITimeoutError,
        OutputParserException,
        RateLimitError,
        ValueError,
    ):
        return _uncertain_response("The answer service is temporarily unavailable.")

    return _validate_llm_result(raw_result, evidence)
