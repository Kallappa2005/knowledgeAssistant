import json
from typing import Any

from groq import (
    APIConnectionError,
    APIError,
    APITimeoutError,
    NotFoundError,
    RateLimitError,
)
from langchain_core.exceptions import OutputParserException
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq

from app.core.config import get_settings
from app.services.pdf_service import extract_pdf_pages


def _material_text(storage_path: str) -> str:
    pages = extract_pdf_pages(storage_path)
    return "\n\n".join(f"Page {page.page_number}:\n{page.text}" for page in pages)


def _invoke(prompt: ChatPromptTemplate, material: str) -> dict[str, Any]:
    settings = get_settings()
    if not settings.groq_api_key:
        raise RuntimeError("Groq API credentials are not configured.")
    models = [settings.groq_model]
    if settings.groq_fallback_model != settings.groq_model:
        models.append(settings.groq_fallback_model)
    last_error: Exception | None = None
    for model_name in models:
        try:
            model = ChatGroq(
                api_key=settings.groq_api_key,
                model=model_name,
                temperature=0,
                max_retries=1,
            )
            return (prompt | model | JsonOutputParser()).invoke(
                {"material": json.dumps(material, ensure_ascii=True)}
            )
        except NotFoundError as error:
            last_error = error
    if last_error:
        raise last_error
    raise RuntimeError("The learning AI service did not return a result.")


def generate_summary(storage_path: str) -> str:
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "Summarize only the supplied training material in 3-5 concise sentences. "
                "Do not use outside knowledge. Return JSON only: "
                '{{"summary": "string"}}',
            ),
            ("human", "Training material:\n{material}"),
        ]
    )
    result = _invoke(prompt, _material_text(storage_path))
    summary = result.get("summary")
    if not isinstance(summary, str) or not summary.strip():
        raise ValueError("The generated training summary was invalid.")
    return summary.strip()


def generate_quiz(storage_path: str) -> list[dict[str, Any]]:
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "Create exactly 3 simple knowledge-check questions using only the supplied "
                "training material. Each answer must be directly supported by the material. "
                "Keep each answer concise and canonical, preferably 1-12 words. Also provide "
                "2-4 accepted_answers containing equivalent wording that a learner might use. "
                "Return JSON only: {{\"questions\": [{{\"question\": \"string\", "
                "\"answer\": \"string\", \"accepted_answers\": [\"string\"], "
                "\"explanation\": \"string\"}}]}}",
            ),
            ("human", "Training material:\n{material}"),
        ]
    )
    result = _invoke(prompt, _material_text(storage_path))
    questions = result.get("questions")
    if (
        not isinstance(questions, list)
        or len(questions) != 3
        or any(
            not isinstance(item, dict)
            or not all(
                isinstance(item.get(key), str) and item[key].strip()
                for key in ("question", "answer", "explanation")
            )
            or not isinstance(item.get("accepted_answers", []), list)
            or any(
                not isinstance(answer, str) or not answer.strip()
                for answer in item.get("accepted_answers", [])
            )
            for item in questions
        )
    ):
        raise ValueError("The generated knowledge check was invalid.")
    return [
        {
            "id": f"q{index}",
            "question": item["question"].strip(),
            "answer": item["answer"].strip(),
            "accepted_answers": [
                answer.strip()
                for answer in item.get("accepted_answers", [])
                if answer.strip()
            ],
            "explanation": item["explanation"].strip(),
        }
        for index, item in enumerate(questions, start=1)
    ]


def learning_ai_error(error: Exception) -> str:
    if isinstance(error, (APIConnectionError, APITimeoutError, RateLimitError)):
        return "The learning AI service is temporarily unavailable."
    if isinstance(error, (APIError, NotFoundError, OutputParserException, ValueError)):
        return "The learning material could not be processed."
    return str(error)
