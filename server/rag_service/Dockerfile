FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY rag_service ./rag_service
COPY scripts ./scripts

RUN pip install --no-cache-dir fastapi uvicorn chromadb

EXPOSE 8001

CMD ["sh", "-c", "python scripts/ingest.py || true && python -m uvicorn rag_service.app:app --host 0.0.0.0 --port 8001"]