import numpy as np
import soundfile as sf
import os

def create_sine_wave(frequency, duration, sample_rate=16000, filename="dummy.wav"):
    t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    # Sine wave
    wave = 0.5 * np.sin(2 * np.pi * frequency * t)
    
    # Save as 16-bit PCM WAV
    sf.write(filename, wave, sample_rate, subtype='PCM_16')
    print(f"Created {filename}")

if __name__ == "__main__":
    # Create two dummy 16kHz audio files
    create_sine_wave(440, 4.0, filename="dummy_real.wav")   # A4 tone
    create_sine_wave(880, 4.0, filename="dummy_fake.wav")   # A5 tone
