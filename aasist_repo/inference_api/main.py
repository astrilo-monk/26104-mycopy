"""FastAPI service for running the existing AASIST spoof-detection model."""

from __future__ import annotations

import asyncio
import json
import os
import subprocess
import sys
import tempfile
import threading
import uuid
from contextlib import asynccontextmanager
from functools import lru_cache
from pathlib import Path
from typing import Annotated

import numpy as np
import requests
import soundfile as sf
import torch
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from scipy.signal import resample_poly


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from models.AASIST import Model
from common_auth import TokenValidationError, get_secret_key, get_token_subject


# These values intentionally match live_file_softmax_fake.py.
MODEL_PATH = Path(os.getenv("AASIST_MODEL_PATH", PROJECT_ROOT / "models/weights/epoch_003_latest.pth"))
CONFIG_PATH = Path(os.getenv("AASIST_CONFIG_PATH", PROJECT_ROOT / "config/AASIST.conf"))
TARGET_SR = 16_000
TARGET_LENGTH = 64_600
HOP_SECONDS = 1.0
HOP_SIZE = int(HOP_SECONDS * TARGET_SR)
MODEL_VERSION = "AASIST-EPOCH-003"
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", 50 * 1024 * 1024))
SPRING_BOOT_URL = os.getenv("SPRING_BOOT_URL", "http://localhost:8080").rstrip("/")
SPRING_DETECTIONS_URL = f"{SPRING_BOOT_URL}/detections"

ALLOWED_EXTENSIONS = {".wav", ".mp3", ".m4a"}

_model_lock = threading.Lock()
bearer_scheme = HTTPBearer(auto_error=False)


class ChunkResult(BaseModel):
    chunkId: int
    modelScore: float
    spoofProbability: float
    timestamp: float


class AnalyzeResponse(BaseModel):
    callId: str
    chunkResults: list[ChunkResult]
    overallSpoofProbability: float


class AudioDecodeError(Exception):
    """Raised when an upload cannot be decoded into supported audio samples."""


class SpringForwardingError(Exception):
    """Raised when a completed detection cannot be recorded by Spring Boot."""


def _project_file(configured_path: Path) -> Path:
    """Resolve relative model paths from aasist_repo, not the process cwd."""
    return configured_path if configured_path.is_absolute() else PROJECT_ROOT / configured_path


@lru_cache(maxsize=1)
def load_model() -> Model:
    """Load the repository's intended production checkpoint once on CPU."""
    resolved_config = _project_file(CONFIG_PATH)
    resolved_model = _project_file(MODEL_PATH)
    if not resolved_config.is_file():
        raise RuntimeError(f"AASIST configuration was not found: {resolved_config}")
    if not resolved_model.is_file():
        raise RuntimeError(f"AASIST model weights were not found: {resolved_model}")

    with resolved_config.open("r", encoding="utf-8") as config_file:
        config = json.load(config_file)

    model = Model(config["model_config"])
    checkpoint = torch.load(resolved_model, map_location=torch.device("cpu"))
    if isinstance(checkpoint, dict) and "state_dict" in checkpoint:
        checkpoint = checkpoint["state_dict"]

    model.load_state_dict(checkpoint)
    model.eval()
    return model


def _decode_with_ffmpeg(audio_path: Path) -> tuple[np.ndarray, int]:
    """Decode formats libsndfile cannot read while retaining original channels/rate."""
    converted_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as converted_file:
            converted_path = Path(converted_file.name)

        process = subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-i", str(audio_path), str(converted_path)],
            capture_output=True,
            text=True,
            check=False,
        )
        if process.returncode != 0:
            raise AudioDecodeError("The uploaded file could not be decoded as audio.")

        return sf.read(str(converted_path))
    except FileNotFoundError as exception:
        raise AudioDecodeError(
            "This audio format needs ffmpeg, which is not available in this environment."
        ) from exception
    except (RuntimeError, ValueError) as exception:
        raise AudioDecodeError("The uploaded file could not be decoded as audio.") from exception
    finally:
        if converted_path is not None:
            converted_path.unlink(missing_ok=True)


def load_audio(audio_path: Path) -> np.ndarray:
    """Apply the exact mono, 16 kHz and peak-normalization preparation in the script."""
    try:
        audio, sample_rate = sf.read(str(audio_path))
    except (RuntimeError, ValueError):
        audio, sample_rate = _decode_with_ffmpeg(audio_path)

    if len(audio.shape) > 1:
        audio = np.mean(audio, axis=1)
    if audio.size == 0:
        raise AudioDecodeError("The uploaded audio file contains no samples.")

    audio = audio.astype(np.float32)
    if sample_rate != TARGET_SR:
        audio = resample_poly(audio, TARGET_SR, sample_rate).astype(np.float32)

    max_value = np.max(np.abs(audio))
    if max_value > 0:
        audio = audio / max_value
    return audio


def detect_window(model: Model, window: np.ndarray) -> tuple[float, float]:
    """Score one 64,600-sample window using the unchanged AASIST output convention."""
    if len(window) < TARGET_LENGTH:
        window = np.pad(window, (0, TARGET_LENGTH - len(window)))
    else:
        window = window[:TARGET_LENGTH]

    features = torch.tensor(window, dtype=torch.float32).unsqueeze(0)
    with torch.no_grad():
        _, logits = model(features)
        probabilities = torch.softmax(logits, dim=1)
        spoof_probability = probabilities[0, 0].item()
        bonafide_score = logits[0, 1].item()

    return bonafide_score, spoof_probability


def analyze_audio(audio_path: Path) -> list[ChunkResult]:
    """Run the original rolling-window procedure without changing its model behavior."""
    audio = load_audio(audio_path)
    model = load_model()
    results: list[ChunkResult] = []

    # AASIST model inference is kept single-threaded on CPU for predictable memory use.
    with _model_lock:
        if len(audio) < TARGET_LENGTH:
            model_score, spoof_probability = detect_window(model, audio)
            results.append(
                ChunkResult(
                    chunkId=1,
                    modelScore=model_score,
                    spoofProbability=spoof_probability,
                    timestamp=0.0,
                )
            )
        else:
            chunk_id = 0
            start = 0
            while start + TARGET_LENGTH <= len(audio):
                model_score, spoof_probability = detect_window(
                    model, audio[start : start + TARGET_LENGTH]
                )
                chunk_id += 1
                results.append(
                    ChunkResult(
                        chunkId=chunk_id,
                        modelScore=model_score,
                        spoofProbability=spoof_probability,
                        timestamp=round(start / TARGET_SR, 3),
                    )
                )
                start += HOP_SIZE

    return results


def require_bearer_token(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> str:
    """Require the JWT issued by login_system and return it for Spring forwarding."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A valid bearer token is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        get_token_subject(credentials.credentials)
    except TokenValidationError as exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exception
    return f"Bearer {credentials.credentials}"


def send_to_spring(
    call_id: str,
    chunk_result: ChunkResult,
    authorization: str,
) -> None:
    """Record one completed window through the existing Spring Boot endpoint."""
    payload = {
        "callId": call_id,
        "chunkId": chunk_result.chunkId,
        "modelScore": chunk_result.modelScore,
        "spoofProbability": chunk_result.spoofProbability,
        "modelVersion": MODEL_VERSION,
    }
    try:
        response = requests.post(
            SPRING_DETECTIONS_URL,
            json=payload,
            headers={"Authorization": authorization},
            timeout=10,
        )
        response.raise_for_status()
    except requests.RequestException as exception:
        raise SpringForwardingError(
            "The analysis completed, but its detections could not be recorded by Spring Boot."
        ) from exception


async def save_upload(upload: UploadFile) -> Path:
    """Stream an upload to an isolated temporary file with a hard size limit."""
    extension = Path(upload.filename or "").suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Upload a WAV, MP3, or M4A audio file.",
        )
    with tempfile.NamedTemporaryFile(suffix=extension, delete=False) as temporary_file:
        temporary_path = Path(temporary_file.name)
        total_size = 0
        try:
            while chunk := await upload.read(1024 * 1024):
                total_size += len(chunk)
                if total_size > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Audio uploads must not exceed {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
                    )
                temporary_file.write(chunk)
        except Exception:
            temporary_path.unlink(missing_ok=True)
            raise

    return temporary_path


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Fail fast if the shared JWT configuration is absent."""
    get_secret_key()
    yield


app = FastAPI(title="AASIST Inference API", version="1.0.0", lifespan=lifespan)

# Localhost is the only default. Deployments must set the exact frontend origin.
allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/health")
def health() -> dict[str, str]:
    """Readiness check that confirms the production checkpoint loads on CPU."""
    try:
        load_model()
    except RuntimeError as exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exception),
        ) from exception
    return {"status": "ok", "modelVersion": MODEL_VERSION}


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    file: Annotated[UploadFile, File(description="A WAV, MP3, or M4A audio file")],
    spring_authorization: Annotated[str, Depends(require_bearer_token)],
) -> AnalyzeResponse:
    """Analyze uploaded audio and persist every rolling-window result in Spring Boot."""
    temporary_path: Path | None = None
    try:
        temporary_path = await save_upload(file)
        chunk_results = await asyncio.to_thread(analyze_audio, temporary_path)
        call_id = f"CALL-{uuid.uuid4()}"

        for chunk_result in chunk_results:
            await asyncio.to_thread(
                send_to_spring, call_id, chunk_result, spring_authorization
            )

        # For a fraud workflow, a single high-risk window is enough to flag the call.
        overall_spoof_probability = max(result.spoofProbability for result in chunk_results)
        return AnalyzeResponse(
            callId=call_id,
            chunkResults=chunk_results,
            overallSpoofProbability=overall_spoof_probability,
        )
    except HTTPException:
        raise
    except AudioDecodeError as exception:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exception),
        ) from exception
    except SpringForwardingError as exception:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exception),
        ) from exception
    except RuntimeError as exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exception),
        ) from exception
    finally:
        await file.close()
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)
