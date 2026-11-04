from fastapi import APIRouter

from app.api_dependencies import CurrentUser
from app.schemas.rag import RagAnswerResponse, RagQueryRequest
from app.services.rag_service import answer_question

router = APIRouter(prefix="/rag", tags=["retrieval augmented generation"])


@router.post("/query", response_model=RagAnswerResponse)
def query_policy(
    payload: RagQueryRequest,
    _user: CurrentUser,
) -> RagAnswerResponse:
    return answer_question(payload.question)
