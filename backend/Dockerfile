# Build context is the REPO ROOT, not backend/ — this service needs its
# siblings contracts/, ml/, search/, agents/ and data/rules/, not just its
# own folder. See .dockerignore: without it the context is ~1.5GB, mostly
# backend/.venv and frontend/node_modules.
#   docker build -f backend/Dockerfile -t prgi-titleguard-backend .
FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY contracts/ contracts/
COPY backend/ backend/

# The whole of ml/, search/ and agents/ — not just ml/config/.
#
# This image used to copy ml/config/ alone: the weights and stopword files,
# but none of the code that reads them. ml/registry.py, ml/similarity/*,
# ml/rules/*, ml/rag/*, search/retrievers/* and agents/studio.py were all
# absent, so every dynamic import in the registry and in pipeline.py failed
# inside the container and fell back to stubs. The container answered every
# request with HTTP 200 and looked perfectly healthy while running 0/4
# scorers, 0/4 retrievers, no rule engine, no RAG explainer and no Title
# Studio — the same silent-fallback trap documented in docs/ARCHITECTURE.md.
COPY ml/ ml/
COPY search/ search/
COPY agents/ agents/
COPY scripts/ scripts/

# data/rules/ holds rules.json and the wordlists the rule engine loads at
# import time; without it ml/rules/engine.py raises and stage 4 stubs out.
COPY data/rules/ data/rules/

# The processed corpus. title_features.csv is what scripts/load_titles.py
# loads (it carries the derived normalized/transliterated/core columns);
# title_master.csv is what the agents' generator samples from. The raw
# per-page scrape output is excluded via .dockerignore.
COPY data/datasets/dataset1/data/processed/title_features.csv data/datasets/dataset1/data/processed/title_features.csv
COPY data/datasets/dataset1/data/processed/title_master.csv data/datasets/dataset1/data/processed/title_master.csv

ENV PYTHONPATH=/app:/app/backend
ENV STUB_MODE=1

EXPOSE 8000

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
