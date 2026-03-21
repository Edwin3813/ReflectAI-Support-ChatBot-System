import os
import glob
import math
import re
import time
from typing import List, Tuple, Dict

import chromadb
from chromadb.config import Settings

BASE_DIR = os.path.join(
    os.path.dirname(__file__),
    "..",
    "src",
    "storage",
    "knowledge",
    "approved",
)

SUPPORT_COLLECTION = "reflectai_support"
CRISIS_COLLECTION = "reflectai_crisis"

MAX_CHARS_PER_FILE = 2_000_000
CHUNK_SIZE = 900
OVERLAP = 150
EMBED_DIM = 256

CHROMA_HOST = os.getenv("CHROMA_HOST", "localhost")
CHROMA_PORT = int(os.getenv("CHROMA_PORT", "8000"))
CHROMA_ALLOW_RESET = os.getenv("CHROMA_ALLOW_RESET", "false").lower() == "true"
CHROMA_CONNECT_RETRIES = int(os.getenv("CHROMA_CONNECT_RETRIES", "30"))
CHROMA_CONNECT_DELAY_SECONDS = float(os.getenv("CHROMA_CONNECT_DELAY_SECONDS", "2"))

HEADER_KEYS = {
    "SOURCE_ID",
    "SOURCE",
    "TITLE",
    "URL",
    "COLLECTION",
    "CATEGORY",
    "REGION",
    "TRUST_LEVEL",
    "REVIEWED_AT",
}


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


def read_text_capped(file_path: str, max_chars: int) -> str:
    parts = []
    total = 0
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            parts.append(line)
            total += len(line)
            if total >= max_chars:
                break
    return "".join(parts)


def parse_metadata_and_body(raw: str) -> Tuple[Dict[str, str], str]:
    lines = raw.splitlines()
    meta = {}
    body_start = 0

    for i, line in enumerate(lines):
        if ":" not in line:
            body_start = i
            break

        key, value = line.split(":", 1)
        key = key.strip().upper()

        if key not in HEADER_KEYS:
            body_start = i
            break

        meta[key.lower()] = value.strip()
        body_start = i + 1

    body = "\n".join(lines[body_start:]).strip()
    return meta, body


def chunk_text(text: str, chunk_size: int, overlap: int) -> List[str]:
    chunks = []
    i = 0
    n = len(text)

    while i < n:
        end = min(i + chunk_size, n)
        chunk = text[i:end].strip()

        if len(chunk) >= 120:
            chunks.append(chunk)

        if end == n:
            break

        i = end - overlap
        if i < 0:
            i = 0

    return chunks


def connect_with_retry():
    last_error = None

    for attempt in range(1, CHROMA_CONNECT_RETRIES + 1):
        try:
            client = chromadb.HttpClient(
                host=CHROMA_HOST,
                port=CHROMA_PORT,
                settings=Settings(allow_reset=CHROMA_ALLOW_RESET),
            )
            client.heartbeat()
            print(f"Connected to Chroma at {CHROMA_HOST}:{CHROMA_PORT}")
            return client
        except Exception as e:
            last_error = e
            print(
                f"Waiting for Chroma ({attempt}/{CHROMA_CONNECT_RETRIES}) "
                f"at {CHROMA_HOST}:{CHROMA_PORT} ... {e}"
            )
            if attempt < CHROMA_CONNECT_RETRIES:
                time.sleep(CHROMA_CONNECT_DELAY_SECONDS)

    raise RuntimeError(
        f"Could not connect to Chroma at {CHROMA_HOST}:{CHROMA_PORT}: {last_error}"
    )


def should_reset_collections() -> bool:
    return os.getenv("RESET_COLLECTIONS_ON_INGEST", "false").lower() == "true"


def add_chunks_idempotently(target_collection, ids, chunks, metadatas, embeddings) -> int:
    existing_ids = set()

    try:
        existing = target_collection.get(ids=ids)
        existing_ids = set(existing.get("ids", [])) if existing else set()
    except Exception:
        existing_ids = set()

    ids_to_add = []
    docs_to_add = []
    metas_to_add = []
    embeds_to_add = []

    for idx, chunk_id in enumerate(ids):
        if chunk_id in existing_ids:
            continue
        ids_to_add.append(chunk_id)
        docs_to_add.append(chunks[idx])
        metas_to_add.append(metadatas[idx])
        embeds_to_add.append(embeddings[idx])

    if ids_to_add:
        target_collection.add(
            ids=ids_to_add,
            documents=docs_to_add,
            metadatas=metas_to_add,
            embeddings=embeds_to_add,
        )

    return len(ids_to_add)


def main():
    client = connect_with_retry()

    if should_reset_collections():
        for name in [SUPPORT_COLLECTION, CRISIS_COLLECTION]:
            try:
                client.delete_collection(name)
                print(f"Deleted collection: {name}")
            except Exception:
                pass

    support_collection = client.get_or_create_collection(name=SUPPORT_COLLECTION)
    crisis_collection = client.get_or_create_collection(name=CRISIS_COLLECTION)

    txt_files = glob.glob(os.path.join(BASE_DIR, "**", "*.txt"), recursive=True)

    if not txt_files:
        print("No approved .txt files found in:", BASE_DIR)
        return

    total_support_chunks = 0
    total_crisis_chunks = 0

    for fp in sorted(txt_files):
        filename = os.path.basename(fp)
        size_bytes = os.path.getsize(fp)

        raw = read_text_capped(fp, MAX_CHARS_PER_FILE)

        if not raw.strip():
            print(f"Skipped empty/unreadable file: {filename}")
            continue

        meta, body = parse_metadata_and_body(raw)

        if not body.strip():
            print(f"Skipped file with empty body: {filename}")
            continue

        if size_bytes > MAX_CHARS_PER_FILE:
            print(
                f"Capped ingestion for {filename} "
                f"(file size {size_bytes} bytes, ingested first {MAX_CHARS_PER_FILE} chars)"
            )

        collection_name = meta.get("collection", "support").strip().lower()
        target_collection = (
            crisis_collection if collection_name == "crisis" else support_collection
        )

        chunks = chunk_text(body, CHUNK_SIZE, OVERLAP)

        source_id = meta.get("source_id", os.path.splitext(filename)[0])

        ids = []
        metadatas = []
        embeddings = []

        for i, chunk in enumerate(chunks):
            ids.append(f"{source_id}-chunk-{i}")
            metadatas.append(
                {
                    "source_id": source_id,
                    "source": meta.get("source", filename),
                    "title": meta.get("title", filename),
                    "url": meta.get("url", ""),
                    "collection": collection_name,
                    "category": meta.get("category", "general"),
                    "region": meta.get("region", "UK"),
                    "trust_level": meta.get("trust_level", "high"),
                    "reviewed_at": meta.get("reviewed_at", ""),
                    "chunk": i,
                }
            )
            embeddings.append(embed_text(chunk))

        added_count = add_chunks_idempotently(
            target_collection,
            ids,
            chunks,
            metadatas,
            embeddings,
        )

        if collection_name == "crisis":
            total_crisis_chunks += added_count
        else:
            total_support_chunks += added_count

        print(
            f"Ingested {added_count} new chunks into {collection_name}: {filename} "
            f"(total chunks in file: {len(chunks)})"
        )

    print()
    print("Ingestion complete")
    print("Support chunks added:", total_support_chunks)
    print("Crisis chunks added:", total_crisis_chunks)
    print("Support collection total:", support_collection.count())
    print("Crisis collection total:", crisis_collection.count())


if __name__ == "__main__":
    main()