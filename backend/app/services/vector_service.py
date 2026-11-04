from functools import lru_cache
from pathlib import Path
from typing import Any

import chromadb
from chromadb.api.models.Collection import Collection
from chromadb.utils.embedding_functions import EmbeddingFunction
from sentence_transformers import SentenceTransformer

from app.core.config import get_settings
from app.services.chunking_service import DocumentChunk

COLLECTION_NAME = "approved_policy_documents"


class SentenceTransformerEmbeddingFunction(EmbeddingFunction[list[str]]):
    def __init__(self, model_name: str) -> None:
        self.model = SentenceTransformer(model_name)

    def __call__(self, input: list[str]) -> list[list[float]]:
        return self.model.encode(input, normalize_embeddings=True).tolist()


@lru_cache
def get_embedding_function() -> SentenceTransformerEmbeddingFunction:
    return SentenceTransformerEmbeddingFunction(get_settings().embedding_model_name)


@lru_cache
def get_chroma_collection() -> Collection:
    directory = Path(get_settings().chroma_storage_dir)
    directory.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(directory.resolve()))
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        configuration={"hnsw": {"space": "cosine"}},
        embedding_function=get_embedding_function(),
    )


def replace_document_chunks(
    document_id: str,
    document_name: str,
    chunks: list[DocumentChunk],
) -> int:
    collection = get_chroma_collection()
    delete_document_chunks(document_id)
    collection.add(
        ids=[chunk.chunk_id for chunk in chunks],
        documents=[chunk.text for chunk in chunks],
        metadatas=[
            {
                "document_id": document_id,
                "document_name": document_name,
                "page_number": chunk.page_number,
                "section_name": chunk.section_name or "",
                "approval_status": "APPROVED",
                "chunk_id": chunk.chunk_id,
            }
            for chunk in chunks
        ],
    )
    return len(chunks)


def delete_document_chunks(document_id: str) -> None:
    get_chroma_collection().delete(where={"document_id": document_id})


def query_approved_chunks(query: str, limit: int = 5) -> dict[str, Any]:
    return get_chroma_collection().query(
        query_texts=[query],
        n_results=limit,
        where={"approval_status": "APPROVED"},
        include=["documents", "metadatas", "distances"],
    )
