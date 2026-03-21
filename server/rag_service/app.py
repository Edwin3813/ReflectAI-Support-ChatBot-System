import math
import re
import os
from typing import List

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import chromadb

SUPPORT_COLLECTION = "reflectai_support"
CRISIS_COLLECTION = "reflectai_crisis"
EMBED_DIM = 256

CHROMA_HOST = os.getenv("CHROMA_HOST", "chromadb")
CHROMA_PORT = int(os.getenv("CHROMA_PORT", "8000"))

app = FastAPI(title="ReflectAI RAG Service")


class RetrieveRequest(BaseModel):
    query: str
    top_k: int = 3
    mode: str = "support"


def fnv1a32(s: str) -> int:
    h = 0x811C9DC5
    for ch in s:
        h ^= ord(ch)
        h = (h * 0x01000193) & 0xFFFFFFFF
    return h


def tokenize(text: str) -> List[str]:
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return [t for t in text.split() if len(t) >= 2]


def embed_text(text: str) -> List[float]:
    vec = [0.0] * EMBED_DIM
    for tok in tokenize(text):
        h = fnv1a32(tok)
        idx = h % EMBED_DIM
        sign = 1.0 if (h & 1) == 0 else -1.0
        vec[idx] += sign

    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


def get_client():
    return chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT)


@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "rag-service",
        "message": "ReflectAI RAG service is running",
    }


@app.get("/health")
def health():
    try:
        client = get_client()
        support_collection = client.get_or_create_collection(name=SUPPORT_COLLECTION)
        crisis_collection = client.get_or_create_collection(name=CRISIS_COLLECTION)

        return {
            "status": "ok",
            "service": "rag-service",
            "chroma_host": CHROMA_HOST,
            "chroma_port": CHROMA_PORT,
            "support_collection": SUPPORT_COLLECTION,
            "crisis_collection": CRISIS_COLLECTION,
            "support_count": support_collection.count(),
            "crisis_count": crisis_collection.count(),
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not connect to Chroma at {CHROMA_HOST}:{CHROMA_PORT}: {str(e)}",
        )


@app.post("/retrieve")
def retrieve(req: RetrieveRequest):
    try:
        client = get_client()
        collection_name = CRISIS_COLLECTION if req.mode == "crisis" else SUPPORT_COLLECTION
        collection = client.get_or_create_collection(name=collection_name)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not connect to Chroma at {CHROMA_HOST}:{CHROMA_PORT}: {str(e)}",
        )

    try:
        q_emb = embed_text(req.query)

        results = collection.query(
            query_embeddings=[q_emb],
            n_results=req.top_k,
            include=["documents", "metadatas", "distances"],
        )

        docs = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]
        dists = results.get("distances", [[]])[0]

        items = []
        for doc, meta, dist in zip(docs, metas, dists):
            items.append(
                {
                    "text": doc,
                    "source": meta.get("source") if meta else None,
                    "source_id": meta.get("source_id") if meta else None,
                    "title": meta.get("title") if meta else None,
                    "url": meta.get("url") if meta else None,
                    "collection": meta.get("collection") if meta else None,
                    "category": meta.get("category") if meta else None,
                    "trust_level": meta.get("trust_level") if meta else None,
                    "reviewed_at": meta.get("reviewed_at") if meta else None,
                    "chunk": meta.get("chunk") if meta else None,
                    "distance": dist,
                }
            )

        return {
            "results": items,
            "collection_used": collection_name,
            "count": len(items),
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Chroma query failed: {str(e)}",
        )