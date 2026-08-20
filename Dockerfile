# Hugging Face Spaces variant of backend/Dockerfile.
#
# Identical build to backend/Dockerfile — same layers, same COPY list, same
# CPU-only torch — except this one lives at the repo root and listens on
# port 7860 instead of 8000. Both are required:
#
#   * HF Docker Spaces look for a Dockerfile at the repo root by default;
#     there's no per-service "Dockerfile path" setting the way Render has.
#   * 7860 is the port HF's Space proxy assumes unless you configure an
#     app_port override in the Space's README frontmatter — using it here
#     avoids needing that extra config.
#
# backend/Dockerfile stays canonical for Render, docker-compose, and local
# `docker build` — nothing else references this file. If you change one,
# change both: same requirements, same COPY paths, same story, different
# entrypoint port.
#   docker build -f Dockerfile -t prgi-titleguard-backend-hf .
FROM python:3.11-slim

WORKDIR /app

# CPU-only torch, installed BEFORE the rest so pip already sees torch
# satisfied and never resolves the default CUDA build. See backend/Dockerfile
# for the full reasoning (measured: 2.9GB of unused CUDA libs otherwise).
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# agents/ has its own requirements (langgraph, groq, httpx), not a subset of
# the backend's. Without this, ml/rag/explain.py's import of agents.llm
# fails and the RAG explainer + /v1/alternatives silently fall back to stubs.
COPY agents/requirements.txt agents/requirements.txt
RUN pip install --no-cache-dir -r agents/requirements.txt

COPY contracts/ contracts/
COPY backend/ backend/
COPY ml/ ml/
COPY search/ search/
COPY agents/ agents/
COPY scripts/ scripts/
COPY data/rules/ data/rules/
COPY data/datasets/dataset1/data/processed/title_features.csv data/datasets/dataset1/data/processed/title_features.csv
COPY data/datasets/dataset1/data/processed/title_master.csv data/datasets/dataset1/data/processed/title_master.csv

ENV PYTHONPATH=/app:/app/backend
ENV STUB_MODE=1

EXPOSE 7860

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "7860"]
