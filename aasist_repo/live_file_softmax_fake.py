import json
import torch
import soundfile as sf
import numpy as np
from scipy.signal import resample_poly
import requests

from models.AASIST import Model


MODEL_PATH = r"models/weights/epoch_003_latest.pth"
CONFIG_PATH = r"config/AASIST.conf"
AUDIO_PATH = r"C:\Users\mousu\Downloads\FAKE_AUDIO_PHONE.wav"

TARGET_SR = 16000
TARGET_LENGTH = 64600

WINDOW_SECONDS = TARGET_LENGTH / TARGET_SR
HOP_SECONDS = 1.0

SPOOF_THRESHOLD = 0.80
SUSPICIOUS_THRESHOLD = 0.50

SPRING_BOOT_URL = "http://localhost:8080/detections"
MODEL_VERSION = "AASIST-EPOCH-003"
CALL_ID = "CALL-FAKE-001"


print()
print("=" * 65)
print("LOADING AASIST")
print("=" * 65)

with open(CONFIG_PATH, "r") as f:
    config = json.load(f)

model = Model(config["model_config"])

checkpoint = torch.load(
    MODEL_PATH,
    map_location=torch.device("cpu")
)

if isinstance(checkpoint, dict) and "state_dict" in checkpoint:
    checkpoint = checkpoint["state_dict"]

model.load_state_dict(checkpoint)
model.eval()

print("Model loaded successfully.")


print()
print("=" * 65)
print("LOADING AUDIO")
print("=" * 65)

audio, sample_rate = sf.read(AUDIO_PATH)

print(f"Original sample rate : {sample_rate} Hz")
print(f"Original shape       : {audio.shape}")

if len(audio.shape) > 1:
    audio = np.mean(audio, axis=1)

audio = audio.astype(np.float32)

if sample_rate != TARGET_SR:
    print(
        f"Resampling            : "
        f"{sample_rate} Hz -> {TARGET_SR} Hz"
    )

    audio = resample_poly(
        audio,
        TARGET_SR,
        sample_rate
    ).astype(np.float32)

sample_rate = TARGET_SR

print(f"Final sample rate     : {sample_rate} Hz")
print(f"Duration              : {len(audio) / sample_rate:.2f}s")


max_value = np.max(np.abs(audio))

if max_value > 0:
    audio = audio / max_value


window_size = TARGET_LENGTH
hop_size = int(HOP_SECONDS * TARGET_SR)

print(f"AASIST window         : {WINDOW_SECONDS:.4f}s")
print(f"AASIST input          : {TARGET_LENGTH} samples")
print(f"Detection hop         : {HOP_SECONDS:.1f}s")


def detect_window(window):

    if len(window) < TARGET_LENGTH:
        window = np.pad(
            window,
            (0, TARGET_LENGTH - len(window))
        )
    else:
        window = window[:TARGET_LENGTH]

    x = torch.tensor(
        window,
        dtype=torch.float32
    ).unsqueeze(0)

    with torch.no_grad():

        output = model(x)

        logits = output[1]

        probabilities = torch.softmax(
            logits,
            dim=1
        )

        spoof_probability = probabilities[0, 0].item()
        real_probability = probabilities[0, 1].item()

        bonafide_score = logits[0, 1].item()

    return (
        bonafide_score,
        spoof_probability,
        real_probability
    )


def send_to_spring(
    chunk_id,
    bonafide_score,
    spoof_probability
):

    payload = {
        "callId": CALL_ID,
        "chunkId": chunk_id,
        "modelScore": bonafide_score,
        "spoofProbability": spoof_probability,
        "modelVersion": MODEL_VERSION
    }

    try:

        response = requests.post(
            SPRING_BOOT_URL,
            json=payload,
            timeout=10
        )

        print(
            f"Spring Boot       : "
            f"{response.status_code}"
        )

        if response.status_code >= 400:

            print(
                f"Spring response   : "
                f"{response.text}"
            )

    except requests.RequestException as e:

        print(
            f"Spring Boot       : "
            f"CONNECTION FAILED - {e}"
        )


print()
print("=" * 65)
print("LIVE AASIST SOFTMAX DETECTION")
print("=" * 65)

print()

print(
    f"Using rolling {WINDOW_SECONDS:.2f}-second windows..."
)

print(
    "A new detection is produced every 1 second."
)

print()


window_number = 0
start = 0


if len(audio) < TARGET_LENGTH:

    window_number = 1

    window = audio

    (
        bonafide_score,
        spoof_probability,
        real_probability
    ) = detect_window(window)

    spoof_percentage = spoof_probability * 100
    real_percentage = real_probability * 100

    if spoof_probability >= SPOOF_THRESHOLD:

        prediction = "POSSIBLE SPOOF"
        risk = "HIGH"

    elif spoof_probability >= SUSPICIOUS_THRESHOLD:

        prediction = "SUSPICIOUS"
        risk = "MEDIUM"

    else:

        prediction = "REAL"
        risk = "LOW"

    print("-" * 65)

    print(
        f"WINDOW {window_number:02d}"
        f"   Time: 0.0s"
    )

    print(
        f"Bonafide score     : "
        f"{bonafide_score:8.4f}"
    )

    print(
        f"Spoof confidence   : "
        f"{spoof_percentage:6.2f}%"
    )

    print(
        f"Real confidence    : "
        f"{real_percentage:6.2f}%"
    )

    print(
        f"Prediction         : "
        f"{prediction}"
    )

    print(
        f"Risk               : "
        f"{risk}"
    )

    send_to_spring(
        window_number,
        bonafide_score,
        spoof_probability
    )


else:

    while start + window_size <= len(audio):

        end = start + window_size

        window = audio[start:end]

        window_number += 1

        timestamp = start / TARGET_SR

        (
            bonafide_score,
            spoof_probability,
            real_probability
        ) = detect_window(window)

        spoof_percentage = spoof_probability * 100
        real_percentage = real_probability * 100

        if spoof_probability >= SPOOF_THRESHOLD:

            prediction = "POSSIBLE SPOOF"
            risk = "HIGH"

        elif spoof_probability >= SUSPICIOUS_THRESHOLD:

            prediction = "SUSPICIOUS"
            risk = "MEDIUM"

        else:

            prediction = "REAL"
            risk = "LOW"

        print("-" * 65)

        print(
            f"WINDOW {window_number:02d}"
            f"   Time: {timestamp:5.1f}s"
        )

        print(
            f"Bonafide score     : "
            f"{bonafide_score:8.4f}"
        )

        print(
            f"Spoof confidence   : "
            f"{spoof_percentage:6.2f}%"
        )

        print(
            f"Real confidence    : "
            f"{real_percentage:6.2f}%"
        )

        print(
            f"Prediction         : "
            f"{prediction}"
        )

        print(
            f"Risk               : "
            f"{risk}"
        )

        send_to_spring(
            window_number,
            bonafide_score,
            spoof_probability
        )

        start += hop_size


print()
print("=" * 65)
print("DETECTION COMPLETE")
print("=" * 65)