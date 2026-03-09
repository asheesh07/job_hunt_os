# backend/speech/pipeline.py
"""
Speech Pipeline
================
STT: faster-whisper (local, free, runs on P100)
TTS: Coqui TTS or pyttsx3 fallback

Architecture:
  - record_answer()  → captures mic audio → returns WAV bytes
  - transcribe()     → WAV bytes → text via faster-whisper
  - speak()          → text → audio via Coqui/pyttsx3 → plays or returns bytes
  - full_turn()      → speak question → record answer → transcribe → return text
"""

import os
import io
import time
import threading
import tempfile
import numpy as np
from pathlib import Path
from typing import Optional, Tuple

# ── STT: faster-whisper ───────────────────────────────────────────────────────

_whisper_model = None

def _get_whisper():
    global _whisper_model
    if _whisper_model is None:
        try:
            from faster_whisper import WhisperModel
            # "base" model: 74MB, ~32x real-time on CPU, much faster on GPU
            # use "small" for better accuracy (244MB)
            device = "cuda" if _cuda_available() else "cpu"
            compute = "float16" if device == "cuda" else "int8"
            print(f"[Speech] Loading Whisper base on {device}/{compute}...")
            _whisper_model = WhisperModel("base", device=device, compute_type=compute)
            print("[Speech] Whisper loaded.")
        except ImportError:
            print("[Speech] faster-whisper not installed. Run: pip install faster-whisper")
            _whisper_model = None
    return _whisper_model


def _cuda_available() -> bool:
    try:
        import torch
        return torch.cuda.is_available()
    except ImportError:
        return False


def transcribe(audio_bytes: bytes, language: str = "en") -> Tuple[str, float]:
    """
    Transcribe audio bytes to text using faster-whisper.
    Returns (transcript_text, confidence_score).
    """
    model = _get_whisper()
    if model is None:
        return "[Whisper not available]", 0.0

    # Write to temp file (faster-whisper needs file path)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        f.write(audio_bytes)
        tmp_path = f.name

    try:
        segments, info = model.transcribe(
            tmp_path,
            language=language,
            beam_size=5,
            vad_filter=True,        # skip silence
            vad_parameters={"min_silence_duration_ms": 500},
        )
        segments = list(segments)
        text = " ".join(s.text.strip() for s in segments).strip()

        # Avg log-prob as confidence proxy (roughly 0-1 after transform)
        avg_logprob = info.transcription_options if hasattr(info, 'transcription_options') else None
        confidence  = 0.9 if text else 0.0

        return text, confidence
    finally:
        os.unlink(tmp_path)


def transcribe_file(file_path: str) -> Tuple[str, float]:
    """Transcribe from a file path directly."""
    with open(file_path, "rb") as f:
        return transcribe(f.read())


# ── Audio Recording ───────────────────────────────────────────────────────────

def record_answer(
    max_duration: int = 120,
    silence_timeout: float = 3.0,
    sample_rate: int = 16000,
) -> Optional[bytes]:
    """
    Record from microphone until silence or max_duration.
    Returns WAV bytes or None if recording fails.

    Args:
        max_duration:    max recording seconds
        silence_timeout: stop after N seconds of silence
        sample_rate:     audio sample rate (16000 Hz for Whisper)
    """
    try:
        import sounddevice as sd
        from scipy.io import wavfile
    except ImportError:
        print("[Speech] sounddevice/scipy not installed. Install with: pip install sounddevice scipy")
        return None

    frames = []
    silence_frames = 0
    silence_threshold = 0.01  # RMS threshold for silence detection
    chunk_size = int(sample_rate * 0.1)  # 100ms chunks

    print(f"[Speech] Recording... (max {max_duration}s, stops after {silence_timeout}s silence)")

    def callback(indata, frames_count, time_info, status):
        nonlocal silence_frames
        frames.append(indata.copy())
        rms = np.sqrt(np.mean(indata ** 2))
        if rms < silence_threshold:
            silence_frames += 1
        else:
            silence_frames = 0

    max_chunks = int(max_duration * 10)  # chunks at 100ms each
    stop_event = threading.Event()

    with sd.InputStream(
        samplerate=sample_rate,
        channels=1,
        dtype='float32',
        blocksize=chunk_size,
        callback=callback,
    ):
        for _ in range(max_chunks):
            time.sleep(0.1)
            if silence_frames >= int(silence_timeout * 10):
                print("[Speech] Silence detected, stopping.")
                break

    if not frames:
        return None

    audio = np.concatenate(frames, axis=0)
    audio_int16 = (audio * 32767).astype(np.int16)

    buf = io.BytesIO()
    wavfile.write(buf, sample_rate, audio_int16)
    return buf.getvalue()


# ── TTS: Coqui / pyttsx3 fallback ────────────────────────────────────────────

_tts_engine = None
_tts_type   = None

def _get_tts():
    global _tts_engine, _tts_type

    if _tts_engine is not None:
        return _tts_engine, _tts_type

    # Try Coqui TTS first (better quality)
    try:
        from TTS.api import TTS as CoquiTTS
        print("[Speech] Loading Coqui TTS (tts_models/en/ljspeech/tacotron2-DDC)...")
        _tts_engine = CoquiTTS("tts_models/en/ljspeech/tacotron2-DDC", progress_bar=False)
        _tts_type = "coqui"
        print("[Speech] Coqui TTS ready.")
        return _tts_engine, _tts_type
    except Exception as e:
        print(f"[Speech] Coqui TTS unavailable: {e}")

    # Fallback: pyttsx3 (always available, no downloads)
    try:
        import pyttsx3
        engine = pyttsx3.init()
        engine.setProperty("rate", 165)   # slightly slower for clarity
        engine.setProperty("volume", 0.9)
        # Try to set a better voice
        voices = engine.getProperty("voices")
        for v in voices:
            if "english" in v.name.lower() or "en" in v.id.lower():
                engine.setProperty("voice", v.id)
                break
        _tts_engine = engine
        _tts_type   = "pyttsx3"
        print("[Speech] pyttsx3 TTS ready (fallback).")
        return _tts_engine, _tts_type
    except Exception as e:
        print(f"[Speech] pyttsx3 unavailable: {e}")

    return None, None


def speak(text: str, blocking: bool = True) -> Optional[bytes]:
    """
    Convert text to speech and play it.
    Returns audio bytes if using Coqui (for saving/streaming),
    None for pyttsx3 (plays directly).
    """
    engine, tts_type = _get_tts()

    if engine is None:
        print(f"[Speech] TTS unavailable. Would say: {text}")
        return None

    if tts_type == "coqui":
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            tmp_path = f.name
        try:
            engine.tts_to_file(text=text, file_path=tmp_path)
            _play_wav(tmp_path)
            with open(tmp_path, "rb") as f:
                return f.read()
        finally:
            os.unlink(tmp_path)

    elif tts_type == "pyttsx3":
        if blocking:
            engine.say(text)
            engine.runAndWait()
        else:
            threading.Thread(target=lambda: (engine.say(text), engine.runAndWait()), daemon=True).start()
        return None

    return None


def speak_to_bytes(text: str) -> Optional[bytes]:
    """Return audio bytes without playing (for API streaming)."""
    engine, tts_type = _get_tts()
    if tts_type == "coqui":
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            tmp_path = f.name
        try:
            engine.tts_to_file(text=text, file_path=tmp_path)
            with open(tmp_path, "rb") as f:
                return f.read()
        finally:
            os.unlink(tmp_path)
    return None


def _play_wav(path: str):
    """Play a WAV file using sounddevice or fallback."""
    try:
        import sounddevice as sd
        from scipy.io import wavfile
        sr, data = wavfile.read(path)
        sd.play(data, sr)
        sd.wait()
    except Exception:
        # system fallback
        if os.name == "posix":
            os.system(f"aplay {path} 2>/dev/null || afplay {path} 2>/dev/null")
        else:
            import winsound
            winsound.PlaySound(path, winsound.SND_FILENAME)


# ── Full Turn Pipeline ────────────────────────────────────────────────────────

def full_speech_turn(
    question_text: str,
    max_answer_duration: int = 120,
) -> Tuple[str, float, bytes]:
    """
    Complete speech turn:
    1. Speak the question via TTS
    2. Record candidate's answer
    3. Transcribe via Whisper
    4. Return (transcript, confidence, raw_audio_bytes)
    """
    print(f"\n[Interviewer] {question_text}")
    speak(question_text, blocking=True)

    print("\n[Recording your answer...]")
    audio_bytes = record_answer(max_duration=max_answer_duration)

    if not audio_bytes:
        return "", 0.0, b""

    print("[Transcribing...]")
    transcript, confidence = transcribe(audio_bytes)
    print(f"[You said]: {transcript}")

    return transcript, confidence, audio_bytes


# ── Speech Health Check ───────────────────────────────────────────────────────

def check_speech_pipeline() -> Dict:
    """
    Check which speech components are available.
    Called on startup to surface setup instructions.
    """
    status = {}

    # Whisper
    try:
        from faster_whisper import WhisperModel
        status["whisper"] = {"available": True, "model": "base", "backend": "faster-whisper"}
    except ImportError:
        status["whisper"] = {
            "available": False,
            "install": "pip install faster-whisper",
            "note": "Required for speech-to-text (STT)",
        }

    # Coqui TTS
    try:
        from TTS.api import TTS
        status["tts_coqui"] = {"available": True, "quality": "high"}
    except ImportError:
        status["tts_coqui"] = {
            "available": False,
            "install": "pip install TTS",
            "note": "High-quality TTS (optional, pyttsx3 used as fallback)",
        }

    # pyttsx3
    try:
        import pyttsx3
        status["tts_pyttsx3"] = {"available": True, "quality": "medium", "note": "Fallback TTS"}
    except ImportError:
        status["tts_pyttsx3"] = {"available": False, "install": "pip install pyttsx3"}

    # sounddevice (microphone)
    try:
        import sounddevice as sd
        devices = sd.query_devices()
        input_devices = [d for d in devices if d['max_input_channels'] > 0]
        status["microphone"] = {
            "available": len(input_devices) > 0,
            "devices": [d['name'] for d in input_devices[:3]],
        }
    except ImportError:
        status["microphone"] = {"available": False, "install": "pip install sounddevice scipy"}

    status["speech_mode"] = (
        "full"    if status.get("whisper", {}).get("available") and status.get("microphone", {}).get("available")
        else "tts_only" if (status.get("tts_coqui", {}).get("available") or status.get("tts_pyttsx3", {}).get("available"))
        else "text_only"
    )

    return status


# type hint fix
from typing import Dict