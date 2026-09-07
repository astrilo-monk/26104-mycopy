FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# ffmpeg provides reliable MP3/M4A decoding; libsndfile is used by soundfile.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

COPY inference_api/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY config ./config
COPY models ./models
COPY common_auth.py ./common_auth.py
COPY inference_api ./inference_api

EXPOSE 8000

CMD ["uvicorn", "inference_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
