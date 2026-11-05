import json
import re
from dataclasses import dataclass
from typing import Any
from uuid import UUID

from groq import (
    APIConnectionError,
    APIError,
    APITimeoutError,
    NotFoundError,
    RateLimitError,
)
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


def _is_casual_message(question: str) -> bool:
    normalized = re.sub(r"[^a-z\s]", " ", question.lower())
    normalized = " ".join(normalized.split())
    words = normalized.split()
    if words and len(words) <= 3 and all(
        word in {"hi", "hello", "hey", "there"} for word in words
    ):
        return True
    return normalized in {
        "hi",
        "hello",
        "hey",
        "hi there",
        "hello there",
        "hey there",
        "good morning",
        "good afternoon",
        "good evening",
        "how are you",
        "how are you doing",
        "how is it going",
        "thanks",
        "thank you",
        "bye",
        "goodbye",
    }


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
                """You are a concise employee policy assistant.
Classify the request before answering:
- For greetings, thanks, farewells, and simple friendly conversation, respond naturally and briefly.
  Set response_type to "conversational", supported to true, and citation_chunk_ids to [].
- For workplace policy questions, answer only from the supplied approved evidence.
  Set response_type to "policy" and supported to true only when the evidence directly supports the answer.
- For unrelated or unsupported policy questions, set response_type to "policy", supported to false,
  and do not use general knowledge.
Never infer or speculate. Keep answers to 2-4 short sentences.
Return valid JSON only:
{{"response_type": "conversational"|"policy", "supported": boolean, "answer": string, "citation_chunk_ids": [string]}}.
For policy answers, include only the most relevant 1-2 citation_chunk_ids.
Every citation_chunk_id must exactly match an evidence chunk_id.""",
            ),
            (
                "human",
                "Question: {question}\n\nApproved evidence:\n{evidence}",
            ),
        ]
    )


def _evidence_payload(evidence: list[RetrievedEvidence]) -> list[dict[str, Any]]:
    return [
        {
            "chunk_id": item.chunk_id,
            "document_id": str(item.document_id),
            "document_name": item.document_name,
            "page_number": item.page_number,
            "section_name": item.section_name,
            "excerpt": item.excerpt,
            "distance": item.distance,
        }
        for item in evidence
    ]


def _compact_excerpt(text: str, max_chars: int) -> str:
    normalized = " ".join(text.split())
    if len(normalized) <= max_chars:
        return normalized
    sentences = re.split(r"(?<=[.!?])\s+", normalized)
    excerpt = ""
    for sentence in sentences:
        candidate = f"{excerpt} {sentence}".strip()
        if len(candidate) > max_chars:
            break
        excerpt = candidate
    if excerpt:
        return excerpt
    return f"{normalized[:max_chars].rsplit(' ', 1)[0]}..."


def _invoke_model(
    model_name: str,
    api_key: str,
    question: str,
    evidence: list[RetrievedEvidence],
) -> dict[str, Any]:
    model = ChatGroq(
        api_key=api_key,
        model=model_name,
        temperature=0,
        max_retries=1,
    )
    return (_prompt() | model | JsonOutputParser()).invoke(
        {
            "question": question,
            "evidence": json.dumps(_evidence_payload(evidence), ensure_ascii=True),
        }
    )


def _validate_llm_result(
    result: dict[str, Any], evidence: list[RetrievedEvidence]
) -> RagAnswerResponse:
    settings = get_settings()
    by_id = {item.chunk_id: item for item in evidence}
    supported = result.get("supported") is True
    response_type = result.get("response_type")
    answer = result.get("answer")
    citation_ids = result.get("citation_chunk_ids")
    if (
        response_type == "conversational"
        and supported
        and isinstance(answer, str)
        and answer.strip()
        and citation_ids == []
    ):
        return RagAnswerResponse(
            answer=answer.strip(),
            citations=[],
            uncertain=False,
            escalation_recommended=False,
        )
    if (
        response_type not in {None, "policy"}
        or
        not supported
        or not isinstance(answer, str)
        or not answer.strip()
        or not isinstance(citation_ids, list)
        or not citation_ids
        or any(not isinstance(item, str) or item not in by_id for item in citation_ids)
    ):
        return _uncertain_response("The generated answer failed grounding validation.")

    citation_items = sorted(
        (by_id[citation_id] for citation_id in citation_ids),
        key=lambda item: item.distance,
    )
    closest_distance = citation_items[0].distance
    citation_items = [
        item
        for item in citation_items
        if item.distance <= closest_distance + settings.rag_citation_distance_margin
    ][: settings.rag_max_citations]
    citations = [
        RagCitation(
            chunk_id=item.chunk_id,
            document_id=item.document_id,
            document_name=item.document_name,
            page_number=item.page_number,
            section_name=item.section_name,
            excerpt=_compact_excerpt(item.excerpt, settings.rag_excerpt_max_chars),
            distance=item.distance,
        )
        for item in citation_items
    ]
    return RagAnswerResponse(
        answer=answer.strip(),
        citations=citations,
        uncertain=False,
        escalation_recommended=False,
    )


def answer_question(question: str) -> RagAnswerResponse:
    settings = get_settings()
    is_casual = _is_casual_message(question)
    if is_casual:
        evidence: list[RetrievedEvidence] = []
    else:
        evidence = retrieve_evidence(question)
    if not is_casual and not evidence:
        return _uncertain_response("No approved evidence met the retrieval threshold.")
    if not settings.groq_api_key:
        return _uncertain_response("Groq API credentials are not configured.")

    try:
        try:
            raw_result = _invoke_model(
                settings.groq_model,
                settings.groq_api_key,
                question,
                evidence,
            )
        except NotFoundError:
            if settings.groq_fallback_model == settings.groq_model:
                raise
            raw_result = _invoke_model(
                settings.groq_fallback_model,
                settings.groq_api_key,
                question,
                evidence,
            )
    except (
        APIConnectionError,
        APIError,
        APITimeoutError,
        NotFoundError,
        OutputParserException,
        RateLimitError,
        ValueError,
    ):
        return _uncertain_response("The answer service is temporarily unavailable.")

    return _validate_llm_result(raw_result, evidence)
