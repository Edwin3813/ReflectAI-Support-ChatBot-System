import math
import re
from typing import List

import chromadb

COLLECTION_NAME = "reflectai_knowledge"
EMBED_DIM = 256

def fnv1a32(s: str) -> int:
    h = 0x811c9dc5
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

    norm = math.sqrt(sum(v*v for v in vec)) or 1.0
    return [v / norm for v in vec]

def main():
    # Connect to Chroma server
    client = chromadb.HttpClient(host="localhost", port=8000)
    collection = client.get_collection(name=COLLECTION_NAME)

    query = input("Enter a question/query: ").strip()
    if not query:
        print("No query entered.")
        return

    q_emb = embed_text(query)

    results = collection.query(
        query_embeddings=[q_emb],
        n_results=3,
        include=["documents", "metadatas", "distances"],
    )

    print("\n=== Top Results ===")
    docs = results.get("documents", [[]])[0]
    metas = results.get("metadatas", [[]])[0]
    dists = results.get("distances", [[]])[0]

    for i, (doc, meta, dist) in enumerate(zip(docs, metas, dists), start=1):
        print(f"\nResult #{i}")
        print(f"Distance: {dist}")
        print(f"Source: {meta.get('source')} | Chunk: {meta.get('chunk')}")
        print("Text:")
        print(doc)

if __name__ == "__main__":
    main()