FROM python:3.11-slim

WORKDIR /workspace

# Install system dependencies for OpenCV and networking
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy dependencies
COPY backend/requirements.txt /workspace/backend/requirements.txt
RUN pip install --no-cache-dir -r /workspace/backend/requirements.txt

# Copy ML model artifacts and code
COPY ml /workspace/ml
COPY backend /workspace/backend

WORKDIR /workspace/backend

EXPOSE 3000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3000"]
