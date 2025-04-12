FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
COPY requirements.txt .

RUN python -m pip install --upgrade pip && \
    python -m pip install --no-cache-dir wheel setuptools build && \
    python -m pip install --no-cache-dir certifi six urllib3 && \
    cd /tmp && \
    python -m pip download --no-deps --no-binary :all: cloudinary==1.36.0 && \
    tar xf cloudinary-1.36.0.tar.gz && \
    cd cloudinary-1.36.0 && \
    python setup.py install && \
    cd /app && \
    pip install --no-cache-dir -r requirements.txt

COPY post.py .

ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=post.py

EXPOSE 5000

CMD ["python", "post.py"]
