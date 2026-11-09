from pathlib import Path

import pytest

from app.services import learning_ai_service
from app.routes.learning_employee import _answers_match


def test_generate_quiz_returns_exactly_three_questions(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    training_file = tmp_path / "training.pdf"
    training_file.write_bytes(b"%PDF-")
    monkeypatch.setattr(
        learning_ai_service,
        "_material_text",
        lambda _: "The training says employees must report incidents promptly.",
    )
    monkeypatch.setattr(
        learning_ai_service,
        "_invoke",
        lambda *_: {
            "questions": [
                {
                    "question": f"Question {index}",
                    "answer": f"Answer {index}",
                    "accepted_answers": [f"Equivalent answer {index}"],
                    "explanation": f"Explanation {index}",
                }
                for index in range(1, 4)
            ]
        },
    )

    questions = learning_ai_service.generate_quiz(str(training_file))

    assert len(questions) == 3
    assert [item["id"] for item in questions] == ["q1", "q2", "q3"]
    assert questions[0]["accepted_answers"] == ["Equivalent answer 1"]


def test_generate_quiz_rejects_wrong_question_count(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(learning_ai_service, "_material_text", lambda _: "Material")
    monkeypatch.setattr(
        learning_ai_service,
        "_invoke",
        lambda *_: {"questions": []},
    )

    with pytest.raises(ValueError, match="knowledge check was invalid"):
        learning_ai_service.generate_quiz("training.pdf")


def test_generate_summary_requires_non_empty_model_output(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(learning_ai_service, "_material_text", lambda _: "Material")
    monkeypatch.setattr(
        learning_ai_service,
        "_invoke",
        lambda *_: {"summary": " "},
    )

    with pytest.raises(ValueError, match="training summary was invalid"):
        learning_ai_service.generate_summary("training.pdf")


def test_generate_summary_requires_five_paragraphs(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(learning_ai_service, "_material_text", lambda _: "Material")
    monkeypatch.setattr(
        learning_ai_service,
        "_invoke",
        lambda *_: {"summary": "Paragraph one.\n\nParagraph two."},
    )

    with pytest.raises(ValueError, match="training summary was too short"):
        learning_ai_service.generate_summary("training.pdf")


def test_generate_summary_preserves_five_paragraphs(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(learning_ai_service, "_material_text", lambda _: "Material")
    summary = "\n\n".join(f"Paragraph {index}." for index in range(1, 6))
    monkeypatch.setattr(
        learning_ai_service,
        "_invoke",
        lambda *_: {"summary": f"\n{summary}\n"},
    )

    assert learning_ai_service.generate_summary("training.pdf") == summary


@pytest.mark.parametrize(
    ("submitted", "expected"),
    [
        ("Generator and Discriminator.", "The generator and the discriminator"),
        ("RNN", "RNN."),
        ("discriminative AI and generative AI", "Discriminative AI and Generative AI"),
    ],
)
def test_answers_match_reasonable_variations(submitted: str, expected: str) -> None:
    assert _answers_match(submitted, expected)


def test_answers_do_not_match_unrelated_text() -> None:
    assert not _answers_match("Convolutional neural network", "Recurrent neural network")


def test_answers_match_generated_accepted_variant() -> None:
    assert _answers_match(
        "It creates new content",
        ["classifies existing data", "creating new content"],
    )
