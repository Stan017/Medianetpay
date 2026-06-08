# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — builder
# Compila las dependencias con C extensions (asyncpg, cryptography, Pillow).
# El resultado son wheels que se copian al stage final sin necesitar gcc.
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

# Herramientas de compilación + librerías de desarrollo
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
        libjpeg-dev \
        zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Copiar solo el descriptor de dependencias primero.
# Docker cachea esta capa — si pyproject.toml no cambia, no reinstala.
COPY pyproject.toml ./

# Compilar todas las dependencias como wheels en /wheels
RUN pip install --upgrade pip \
    && pip wheel --no-cache-dir --wheel-dir /wheels .


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — runtime
# Imagen final limpia: solo runtime libs, sin gcc ni headers.
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

# Solo librerías de runtime (no -dev)
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
        libjpeg62-turbo \
    && rm -rf /var/lib/apt/lists/*

# Usuario no-root — buena práctica de seguridad en contenedores
RUN useradd --create-home --shell /bin/bash appuser
WORKDIR /app

# Instalar wheels compilados en stage anterior
COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir --no-index --find-links /wheels /wheels/*.whl \
    && rm -rf /wheels

# Copiar el código de la aplicación
COPY app/        ./app/
COPY migrations/ ./migrations/
COPY alembic.ini ./alembic.ini
COPY static/     ./static/

# Crear directorio para uploads dinámicos (QR, imágenes de catálogo)
RUN mkdir -p ./static/qr ./static/catalog ./static/profiles \
    && chown -R appuser:appuser /app

USER appuser

# Cloud Run espera el puerto 8080
EXPOSE 8080

# Al arrancar:
# 1. Corre las migraciones (idempotente — alembic solo aplica las nuevas)
# 2. Levanta uvicorn
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8080 --workers 1"]
