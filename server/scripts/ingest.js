/**
 * ReflectAI – Knowledge Ingestion (Node wrapper)
 *
 * IMPORTANT:
 * ---------------------------------------------
 * Knowledge ingestion for the RAG pipeline is performed using Python
 * due to memory stability issues with the Node chromadb client on Windows.
 *
 * This file is intentionally kept as a lightweight wrapper to:
 *  - Preserve project structure
 *  - Document the ingestion entry point
 *  - Prevent accidental Node heap crashes
 *
 * Use the Python ingestion script instead:
 *
 *   python ./scripts/ingest.py
 *
 * The Python script handles:
 *  - Text chunking
 *  - Embedding generation (CPU-only)
 *  - Vector storage in Chroma
 */

console.log("ℹ️  Ingestion is handled by Python.");
console.log("➡️  Run: python ./scripts/ingest.py");
process.exit(0);