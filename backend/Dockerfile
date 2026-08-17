# Build context is the REPO ROOT, not backend/ — this service needs its
# sibling contracts/ (shared request/response models) and ml/config/
# (weights, stopwords) directories, not just its own folder.
#   docker build -f backend/Dockerfile -t prgi-titleguard-backend .
FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY contracts/ contracts/
COPY ml/config/ ml/config/
COPY backend/ backend/
COPY data/datasets/dataset1/data/processed/title_master.csv data/datasets/dataset1/data/processed/title_master.csv

ENV PYTHONPATH=/app:/app/backend
ENV STUB_MODE=1

EXPOSE 8000

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
