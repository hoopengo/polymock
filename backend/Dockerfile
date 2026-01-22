FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# Install uv
RUN pip install --no-cache-dir uv

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies using uv
RUN uv sync --frozen --no-dev

# Copy alembic configuration
COPY alembic.ini ./
COPY alembic/ ./alembic/

# Copy source code
COPY src/ ./src/

# Copy and set entrypoint script
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Expose port
EXPOSE 8000

# Run migrations and start the application
CMD ["./entrypoint.sh"]
