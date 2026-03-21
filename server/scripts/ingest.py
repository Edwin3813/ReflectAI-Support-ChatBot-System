import os
import glob
import math
import re
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

        i = end - overlap
        if i < 0:
            i = 0

        if end == n:
            break

    return chunks


def main():
    client = chromadb.HttpClient(
        host="localhost",
        port=8000,
        settings=Settings(allow_reset=True),
    )

    for name in [SUPPORT_COLLECTION, CRISIS_COLLECTION]:
        try:
            client.delete_collection(name)
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

    for fp in txt_files:
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

        source_id = meta.get(
            "source_id",
            os.path.splitext(filename)[0]
        )

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

        target_collection.add(
            ids=ids,
            documents=chunks,
            metadatas=metadatas,
            embeddings=embeddings,
        )

        if collection_name == "crisis":
            total_crisis_chunks += len(chunks)
        else:
            total_support_chunks += len(chunks)

        print(f"Ingested {len(chunks)} chunks into {collection_name}: {filename}")

    print()
    print("Ingestion complete")
    print("Support chunks added:", total_support_chunks)
    print("Crisis chunks added:", total_crisis_chunks)
    print("Support collection total:", support_collection.count())
    print("Crisis collection total:", crisis_collection.count())


if __name__ == "__main__":
    main()