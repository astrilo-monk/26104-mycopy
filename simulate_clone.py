import torch
import torchaudio
import torchaudio.transforms as T
import sys
import os

def create_simulated_clone(input_path, output_path):
    print(f"Loading {input_path}...")
    import soundfile as sf
    import numpy as np
    data, sample_rate = sf.read(input_path)
    if len(data.shape) > 1:
        data = np.mean(data, axis=1)
    
    waveform = torch.FloatTensor(data).unsqueeze(0)

    if waveform.shape[0] > 1:
        waveform = torch.mean(waveform, dim=0, keepdim=True)

    print("Extracting Spectrogram...")
    # Standard vocoder parameters
    n_fft = 1024
    win_length = None
    hop_length = 256

    spectrogram = T.Spectrogram(
        n_fft=n_fft,
        win_length=win_length,
        hop_length=hop_length,
        center=True,
        pad_mode="reflect",
        power=2.0,
    )

    spec = spectrogram(waveform)

    print("Reconstructing audio using Griffin-Lim (simulating a synthetic vocoder)...")
    griffin_lim = T.GriffinLim(
        n_fft=n_fft,
        n_iter=32,
        win_length=win_length,
        hop_length=hop_length,
        power=2.0,
    )

    reconstructed_waveform = griffin_lim(spec)
    
    print(f"Saving simulated clone to {output_path}...")
    sf.write(output_path, reconstructed_waveform.squeeze(0).numpy(), sample_rate, subtype='PCM_16')
    print("Done!")

if __name__ == "__main__":
    create_simulated_clone("real_voice.wav", "cloned_voice.wav")
