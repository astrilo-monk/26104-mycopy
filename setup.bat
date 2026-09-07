@echo off
echo Creating virtual environment...
python -m venv venv
call venv\Scripts\activate.bat
echo Installing dependencies...
pip install torch torchaudio numpy scipy soundfile librosa PyYAML ruamel.yaml
echo Done! Run "venv\Scripts\activate.bat" to activate.
pause
