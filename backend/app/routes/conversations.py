from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.api_dependencies import CurrentUser, DatabaseSession
from app.schemas.conversations import (
    ConversationCreateRequest,
    ConversationResponse,
    ConversationSummary,
    QuestionRequest,
)
from app.services.conversation_service import (
    ask_in_conversation,
    conversation_response,
    create_conversation,
    get_owned_conversation,
    list_owned_conversations,
)

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.post(
    "",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create(
    payload: ConversationCreateRequest,
    db: DatabaseSession,
    user: CurrentUser,
) -> ConversationResponse:
    conversation = create_conversation(db, user, payload.title)
    return conversation_response(conversation)


@router.get("", response_model=list[ConversationSummary])
def list_all(
    db: DatabaseSession, user: CurrentUser
) -> list[ConversationSummary]:
    return list_owned_conversations(db, user)


@router.get("/{conversation_id}", response_model=ConversationResponse)
def get_one(
    conversation_id: UUID,
    db: DatabaseSession,
    user: CurrentUser,
) -> ConversationResponse:
    conversation = get_owned_conversation(db, user, conversation_id)
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found."
        )
    return conversation_response(conversation)


@router.post(
    "/{conversation_id}/questions",
    response_model=ConversationResponse,
)
def ask(
    conversation_id: UUID,
    payload: QuestionRequest,
    db: DatabaseSession,
    user: CurrentUser,
) -> ConversationResponse:
    conversation = get_owned_conversation(db, user, conversation_id)
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found."
        )
    return ask_in_conversation(db, conversation, payload.question)
