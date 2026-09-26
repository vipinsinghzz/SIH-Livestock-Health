# ==============================================================================
# Livestock Saathi AI Microservice - Production Container Image
# Neural Architecture: EfficientNetB0 (lsd_model.keras - Keras 3.x)
# ==============================================================================

FROM python:3.12-slim-bookworm

# Set container environment flags
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    KERAS_BACKEND=tensorflow \
    TF_ENABLE_ONEDNN_OPTS=1 \
    AI_SERVICE_PORT=5050

# Install minimal OS dependencies for numerical acceleration and container health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root application user for defense-in-depth security
RUN useradd -m -u 10001 appuser

WORKDIR /app

# Install pinned Python dependencies first to leverage Docker layer caching
COPY ml/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy model weights and AI microservice implementation
COPY backend/lsd_model.keras /app/backend/lsd_model.keras
COPY backend/services/ai_service.py /app/backend/services/ai_service.py
COPY ml/models/candidate/ /app/ml/models/candidate/

# Create symlinks for path compatibility across execution modes:
# 1. /app/services/ai_service.py -> /app/backend/services/ai_service.py
# 2. /app/lsd_model.keras -> /app/backend/lsd_model.keras
# 3. /ml/models/candidate -> /app/ml/models/candidate
RUN mkdir -p /app/services && \
    ln -s /app/backend/services/ai_service.py /app/services/ai_service.py && \
    ln -s /app/backend/lsd_model.keras /app/lsd_model.keras && \
    mkdir -p /ml/models && \
    ln -s /app/ml/models/candidate /ml/models/candidate

# Switch ownership to non-root appuser
RUN chown -R appuser:appuser /app /ml
USER appuser

# Expose AI microservice port
EXPOSE 5050

# Container healthcheck: verify AI health endpoint responds with healthy status
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -f http://127.0.0.1:5050/health || exit 1

# Production startup command
CMD ["python", "services/ai_service.py"]
