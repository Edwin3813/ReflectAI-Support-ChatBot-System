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


def collection_name_for_mode(mode: str) -> str:
    return CRISIS_COLLECTION if mode == "crisis" else SUPPORT_COLLECTION


def normalize_result(doc, meta, dist):
    return {
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


def is_support_resource_query(query: str) -> bool:
    q = str(query or "").lower()
    terms = [
        "samaritans",
        "helpline",
        "hotline",
        "phone number",
        "number",
        "contact",
        "call",
        "support line",
        "crisis line",
        "116 123",
    ]
    return any(term in q for term in terms)


def score_keyword_match(query: str, doc: str, meta: dict) -> int:
    q = str(query or "").lower()
    q_tokens = set(tokenize(q))

    haystack = " ".join(
        [
            str(meta.get("title", "")),
            str(meta.get("source", "")),
            str(meta.get("source_id", "")),
            str(meta.get("category", "")),
            str(doc or ""),
        ]
    ).lower()

    score = 0

    if "samaritans" in q and "samaritans" in haystack:
        score += 10

    if "116 123" in q and "116 123" in haystack:
        score += 10

    if "phone" in q or "number" in q or "contact" in q or "call" in q:
        if "116 123" in haystack:
            score += 6
        if "support-resources" in haystack:
            score += 4

    haystack_tokens = set(tokenize(haystack))
    for token in q_tokens:
        if token in haystack_tokens:
            score += 1

    return score


def keyword_fallback_search(collection, query: str, top_k: int):
    try:
        raw = collection.get(include=["documents", "metadatas"])
    except Exception:
        return []

    docs = raw.get("documents", []) or []
    metas = raw.get("metadatas", []) or []

    ranked = []
    for idx, (doc, meta) in enumerate(zip(docs, metas)):
        meta = meta or {}
        score = score_keyword_match(query, doc, meta)
        if score > 0:
            ranked.append(
                {
                    "score": score,
                    "item": normalize_result(doc, meta, 0.0),
                    "idx": idx,
                }
            )

    ranked.sort(key=lambda x: (-x["score"], x["idx"]))
    return [r["item"] for r in ranked[:top_k]]


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
        collection_name = collection_name_for_mode(req.mode)
        collection = client.get_or_create_collection(name=collection_name)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not connect to Chroma at {CHROMA_HOST}:{CHROMA_PORT}: {str(e)}",
        )

    try:
        q_emb = embed_text(req.query)

        vector_results = collection.query(
            query_embeddings=[q_emb],
            n_results=max(req.top_k, 8 if is_support_resource_query(req.query) else req.top_k),
            include=["documents", "metadatas", "distances"],
        )

        docs = vector_results.get("documents", [[]])[0]
        metas = vector_results.get("metadatas", [[]])[0]
        dists = vector_results.get("distances", [[]])[0]

        items = []
        seen = set()

        for doc, meta, dist in zip(docs, metas, dists):
            item = normalize_result(doc, meta, dist)
            key = (
                item.get("source_id"),
                item.get("chunk"),
                item.get("title"),
                item.get("source"),
            )
            if key in seen:
                continue
            seen.add(key)
            items.append(item)

        # Hybrid keyword fallback for named resources / support contacts
        if is_support_resource_query(req.query):
            keyword_items = keyword_fallback_search(collection, req.query, req.top_k + 5)
            for item in keyword_items:
                key = (
                    item.get("source_id"),
                    item.get("chunk"),
                    item.get("title"),
                    item.get("source"),
                )
                if key in seen:
                    continue
                seen.add(key)
                items.insert(0, item)

        return {
            "results": items[: req.top_k],
            "collection_used": collection_name,
            "count": min(len(items), req.top_k),
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Chroma query failed: {str(e)}",
        )