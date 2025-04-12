FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY User_app.py .

ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=userapp.py

EXPOSE 5002

CMD ["python", "User_app.py"]