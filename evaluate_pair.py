import os
import sys
import json
import torch
import torch.nn.functional as F
import numpy as np
import soundfile as sf
import argparse

# Add aasist_repo to sys path to import its modules
aasist_dir = os.path.join(os.path.dirname(__file__), 'aasist_repo')
sys.path.append(aasist_dir)

from importlib import import_module

def pad_or_crop(audio, target_length=64600):
    """
    Pad or crop audio array to the target length.
    AASIST uses 64600 samples (approx 4s at 16kHz).
    """
    length = audio.shape[0]
    if length > target_length:
        return audio[:target_length]
    elif length < target_length:
        # Pad with repeat
        n_repeat = target_length // length
        remainder = target_length % length
        audio = np.concatenate([np.tile(audio, n_repeat), audio[:remainder]])
        return audio
    return audio

def load_audio(path, target_length=64600):
    """
    Load an audio file, convert to mono if necessary, resample if not 16k?
    For simplicity we assume soundfile can read it, but ideally it should be 16kHz.
    """
    data, sr = sf.read(path)
    if len(data.shape) > 1:
        data = np.mean(data, axis=1)
    
    # Ideally, resample to 16000 here if sr != 16000
    # But for a quick test, we'll assume 16kHz
    
    data = pad_or_crop(data, target_length)
    return torch.FloatTensor(data)

def get_model(config, device):
    model_config = config["model_config"]
    module = import_module("models.{}".format(model_config["architecture"]))
    _model = getattr(module, "Model")
    model = _model(model_config).to(device)
    return model

def main(real_audio_path, fake_audio_path):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    config_path = os.path.join(aasist_dir, "config", "AASIST.conf")
    with open(config_path, "r") as f:
        config = json.loads(f.read())
    
    # Init model
    model = get_model(config, device)
    
    # Load weights
    weights_path = os.path.join(aasist_dir, "models", "weights", "AASIST.pth")
    model.load_state_dict(torch.load(weights_path, map_location=device))
    model.eval()
    print("Model loaded successfully.")
    
    # Load audio
    print(f"Loading real audio: {real_audio_path}")
    real_audio = load_audio(real_audio_path).unsqueeze(0).to(device)
    
    print(f"Loading fake audio: {fake_audio_path}")
    fake_audio = load_audio(fake_audio_path).unsqueeze(0).to(device)
    
    with torch.no_grad():
        # AASIST model forward returns: (features, batch_out)
        _, out_real = model(real_audio)
        _, out_fake = model(fake_audio)
        
        # Apply softmax to get probabilities
        prob_real_c0 = F.softmax(out_real, dim=1)[:, 0].item()
        prob_real_c1 = F.softmax(out_real, dim=1)[:, 1].item()
        
        prob_fake_c0 = F.softmax(out_fake, dim=1)[:, 0].item()
        prob_fake_c1 = F.softmax(out_fake, dim=1)[:, 1].item()
        
        # AASIST typically: spoof is class 1 and bonafide is class 0?
        # Actually in ClOVA AASIST code: 1 is bona fide, 0 is spoof.
        # Let's display "Bona Fide" (1) and "Spoof" (0).

        print("\n--- RESULTS ---")
        print("REAL AUDIO:")
        print(f"  Bona fide probability: {prob_real_c1 * 100:.2f}%")
        print(f"  Spoof probability:     {prob_real_c0 * 100:.2f}%")
        
        print("\nFAKE AUDIO:")
        print(f"  Bona fide probability: {prob_fake_c1 * 100:.2f}%")
        print(f"  Spoof probability:     {prob_fake_c0 * 100:.2f}%")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AASIST Pair Evaluator")
    parser.add_argument("--real", type=str, required=True, help="Path to real audio file (16kHz wav)")
    parser.add_argument("--fake", type=str, required=True, help="Path to fake audio file (16kHz wav)")
    args = parser.parse_args()
    
    main(args.real, args.fake)
