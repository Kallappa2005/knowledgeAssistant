from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.entities import Conversation, Citation, Message, MessageRole, User
from app.schemas.conversations import (
    ConversationResponse,
    ConversationSummary,
    MessageResponse,
)
from app.schemas.rag import RagAnswerResponse, RagCitation
from app.services.rag_service import answer_question


def create_conversation(
    db: Session, user: User, title: str | None
) -> Conversation:
    conversation = Conversation(user_id=user.id, title=title)
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


def get_owned_conversation(
    db: Session, user: User, conversation_id: UUID
) -> Conversation | None:
    return db.scalar(
        select(Conversation)
        .options(
            selectinload(Conversation.messages).selectinload(Message.citations)
        )
        .where(Conversation.id == conversation_id, Conversation.user_id == user.id)
    )


def list_owned_conversations(
    db: Session, user: User
) -> list[ConversationSummary]:
    conversations = db.scalars(
        select(Conversation)
        .where(Conversation.user_id == user.id)
        .order_by(Conversation.updated_at.desc())
    ).all()
    return [
        ConversationSummary(
            id=item.id,
            title=item.title,
            created_at=item.created_at,
            updated_at=item.updated_at,
        )
        for item in conversations
    ]


def delete_conversation(db: Session, conversation: Conversation) -> None:
    db.delete(conversation)
    db.commit()


def _citation_response(citation: Citation) -> RagCitation:
    document = citation.document
    return RagCitation(
        chunk_id=citation.chunk_id,
        document_id=citation.document_id,
        document_name=document.original_filename,
        page_number=citation.page_number,
        section_name=citation.section_name,
        excerpt=citation.excerpt or "",
        distance=0.0,
    )


def _message_response(message: Message) -> MessageResponse:
    return MessageResponse(
        id=message.id,
        role=message.role,
        content=message.content,
        uncertainty=message.uncertainty,
        created_at=message.created_at,
        citations=[_citation_response(item) for item in message.citations],
    )


def conversation_response(conversation: Conversation) -> ConversationResponse:
    messages = sorted(conversation.messages, key=lambda message: message.created_at)
    return ConversationResponse(
        id=conversation.id,
        title=conversation.title,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        messages=[_message_response(message) for message in messages],
    )


def ask_in_conversation(
    db: Session, conversation: Conversation, question: str
) -> ConversationResponse:
    user_message = Message(
        conversation_id=conversation.id,
        role=MessageRole.USER,
        content=question,
    )
    db.add(user_message)
    answer: RagAnswerResponse = answer_question(question)
    assistant_message = Message(
        conversation_id=conversation.id,
        role=MessageRole.ASSISTANT,
        content=answer.answer,
        uncertainty=answer.reason if answer.uncertain else None,
    )
    db.add(assistant_message)
    db.flush()
    for citation in answer.citations:
        db.add(
            Citation(
                message_id=assistant_message.id,
                document_id=citation.document_id,
                page_number=citation.page_number,
                section_name=citation.section_name,
                excerpt=citation.excerpt,
                chunk_id=citation.chunk_id,
            )
        )
    conversation.updated_at = datetime.now(UTC)
    db.commit()
    refreshed = get_owned_conversation(
        db, User(id=conversation.user_id), conversation.id
    )
    if refreshed is None:
        raise LookupError("Conversation could not be loaded after saving.")
    return conversation_response(refreshed)
