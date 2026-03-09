# backend/interview_routes.py
"""
Interview Agent v2 — FastAPI Routes
=====================================
Mount into main.py with:
    app.include_router(interview_router, prefix="/api/interview/v2")

Endpoints:
  POST /qbank/resume          → generate Q bank from resume
  POST /qbank/jd              → generate Q bank from JD
  POST /qbank/merged          → both merged
  POST /stress                → generate stress-test questions for a topic

  POST /session/create        → create new interview session
  GET  /session/{id}          → get session state
  GET  /session/{id}/next     → get next question (spoken + raw)
  POST /session/{id}/answer   → submit answer text + get real-time eval
  POST /session/{id}/report   → generate final report
  GET  /sessions              → list all sessions

  GET  /speech/status         → check speech pipeline availability
  POST /speech/speak          → TTS: text → audio bytes (returns WAV)
  POST /speech/transcribe     → STT: audio bytes → text
  WebSocket /ws/session/{id}  → real-time session (question → answer → feedback loop)
"""

import io
import json
import time
import base64
from typing import Optional
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

interview_router = APIRouter(tags=["interview_v2"])


# ── Request Models ─────────────────────────────────────────────────────────────

class QBankResumeRequest(BaseModel):
    custom_resume: Optional[str] = None

class QBankJDRequest(BaseModel):
    job_description: str
    company: Optional[str] = ""
    role:    Optional[str] = ""

class StressRequest(BaseModel):
    topic:            str
    candidate_answer: Optional[str] = ""

class CreateSessionRequest(BaseModel):
    difficulty_level: int = 2          # 1-5
    mode:             str = "resume"   # resume / jd / merged
    job_description:  Optional[str] = ""
    company:          Optional[str] = ""
    role:             Optional[str] = ""
    num_questions:    int = 8

class SubmitAnswerRequest(BaseModel):
    turn_id:     int
    answer_text: str
    duration_sec: float = 0.0
    is_transcript: bool = False  # True if answer came from speech STT

class SpeakRequest(BaseModel):
    text: str

class TranscribeRequest(BaseModel):
    audio_base64: str  # base64-encoded WAV bytes


# ── Q Bank Endpoints ──────────────────────────────────────────────────────────

@interview_router.post("/qbank/resume")
def qbank_from_resume(req: QBankResumeRequest):
    from agents.interview_v2.question_bank import resume_to_qbank
    return resume_to_qbank(req.custom_resume)


@interview_router.post("/qbank/jd")
def qbank_from_jd(req: QBankJDRequest):
    from agents.interview_v2.question_bank import jd_to_qbank
    if not req.job_description.strip():
        raise HTTPException(400, "job_description is required")
    return jd_to_qbank(req.job_description, req.company, req.role)


@interview_router.post("/qbank/merged")
def qbank_merged(req: QBankJDRequest):
    from agents.interview_v2.question_bank import merged_qbank
    if not req.job_description.strip():
        raise HTTPException(400, "job_description is required")
    return merged_qbank(req.job_description, req.company, req.role)


@interview_router.post("/stress")
def generate_stress(req: StressRequest):
    from agents.interview_v2.question_bank import generate_stress_questions
    return generate_stress_questions(req.topic, req.candidate_answer)


# ── Session Endpoints ─────────────────────────────────────────────────────────

@interview_router.post("/session/create")
def create_session(req: CreateSessionRequest):
    from agents.interview_v2.question_bank import resume_to_qbank, jd_to_qbank, merged_qbank
    from agents.interview_v2.session_manager import create_session as _create
    from memory.store import get_profile

    profile = get_profile()

    # Build question bank based on mode
    if req.mode == "resume":
        bank = resume_to_qbank()
    elif req.mode == "jd":
        if not req.job_description:
            raise HTTPException(400, "job_description required for jd mode")
        bank = jd_to_qbank(req.job_description, req.company, req.role)
    else:  # merged
        if not req.job_description:
            raise HTTPException(400, "job_description required for merged mode")
        bank = merged_qbank(req.job_description, req.company, req.role)

    session = _create(
        difficulty_level = req.difficulty_level,
        mode             = req.mode,
        question_bank    = bank,
        company          = req.company or "",
        role             = req.role or "",
        candidate_name   = profile.get("name", "Candidate"),
        num_questions    = req.num_questions,
    )

    return {
        "session_id":     session.session_id,
        "difficulty":     session.difficulty_level,
        "mode":           session.mode,
        "total_questions": len(session.turns),
        "status":         session.status,
        "turns_preview":  [
            {
                "turn_id":    t.turn_id,
                "category":   t.category,
                "difficulty": t.difficulty,
            }
            for t in session.turns
        ]
    }


@interview_router.get("/session/{session_id}")
def get_session(session_id: str):
    from agents.interview_v2.session_manager import load_session
    session = load_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")

    from dataclasses import asdict
    return asdict(session)


@interview_router.get("/session/{session_id}/next")
def get_next_question(session_id: str):
    """
    Get the next unanswered question, framed through the interviewer persona.
    Returns spoken text (for TTS) and metadata.
    """
    from agents.interview_v2.session_manager import load_session
    from agents.interview_v2.pressure_engine import PressureEngine

    session = load_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")

    # Find first unanswered turn
    next_turn = next((t for t in session.turns if not t.answer_text), None)
    if not next_turn:
        return {"status": "session_complete", "session_id": session_id}

    engine = PressureEngine(session_id, session.difficulty_level)
    framed = engine.ask_question(
        {"id": next_turn.question_id, "question": next_turn.question_text,
         "difficulty": next_turn.difficulty, "expected_answer_framework": next_turn.expected_framework,
         "good_answer_covers": next_turn.rubric},
        question_type=next_turn.question_type,
    )

    return {
        "turn_id":             next_turn.turn_id,
        "question_id":         next_turn.question_id,
        "raw_question":        next_turn.question_text,
        "spoken_text":         framed["spoken_text"],
        "category":            next_turn.category,
        "difficulty":          next_turn.difficulty,
        "expected_framework":  next_turn.expected_framework,
        "rubric":              next_turn.rubric,
        "time_limit_seconds":  next_turn.time_limit,
        "think_time_seconds":  framed.get("think_time", 30),
        "persona":             framed.get("persona", ""),
        "persona_title":       framed.get("persona_title", ""),
        "questions_remaining": sum(1 for t in session.turns if not t.answer_text),
        "questions_total":     len(session.turns),
    }


@interview_router.post("/session/{session_id}/answer")
def submit_answer(session_id: str, req: SubmitAnswerRequest):
    """
    Submit a candidate's answer. Returns immediate evaluation and
    optionally a follow-up question.
    """
    from agents.interview_v2.session_manager import (
        load_session, record_answer as _record, add_followup_turn
    )
    from agents.interview_v2.answer_evaluator import evaluate_answer, score_communication_only
    from agents.interview_v2.pressure_engine import PressureEngine

    session = load_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")

    # Find the turn
    turn = next((t for t in session.turns if t.turn_id == req.turn_id), None)
    if not turn:
        raise HTTPException(404, f"Turn {req.turn_id} not found")

    # Evaluate the answer
    score = evaluate_answer(
        question            = turn.question_text,
        answer              = req.answer_text,
        expected_framework  = turn.expected_framework,
        good_answer_covers  = turn.rubric,
        difficulty          = turn.difficulty,
        is_transcript       = req.is_transcript,
    )

    # Communication analysis (if speech)
    comm_analysis = None
    if req.is_transcript and req.duration_sec > 0:
        comm = score_communication_only(req.answer_text)
        comm["wpm"] = round((len(req.answer_text.split()) / req.duration_sec) * 60)
        comm_analysis = comm

    # Store the scored answer
    score_dict = {
        "scores": {
            "knowledge_depth":     score.knowledge_depth,
            "communication":       score.communication,
            "framework_adherence": score.framework_adherence,
            "confidence_signals":  score.confidence_signals,
            "completeness":        score.completeness,
        },
        "overall":             score.overall,
        "feedback":            score.feedback,
        "strengths":           score.strengths,
        "weaknesses":          score.weaknesses,
        "missing_points":      score.missing_points,
        "improved_answer":     score.improved_answer,
        "filler_detected":     score.filler_detected,
        "follow_up_triggered": score.follow_up_triggered,
    }
    _record(session_id, req.turn_id, req.answer_text, req.duration_sec, score_dict)

    # Add follow-up turn if triggered
    followup_turn = None
    if score.follow_up_triggered and score.follow_up_question:
        engine = PressureEngine(session_id, session.difficulty_level)
        ft = add_followup_turn(
            session_id, req.turn_id,
            score.follow_up_question,
            engine.current_persona["name"],
        )
        if ft:
            followup_turn = {
                "turn_id":      ft.turn_id,
                "question":     ft.question_text,
                "type":         "follow_up",
            }

    # Get interviewer reaction
    engine = PressureEngine(session_id, session.difficulty_level)
    reaction = engine.react_to_answer(
        req.answer_text, score.overall,
        score.follow_up_question if score.follow_up_triggered else None,
    )

    return {
        "evaluation": {
            "overall_score":        score.overall,
            "scores":               score_dict["scores"],
            "feedback":             score.feedback,
            "strengths":            score.strengths,
            "weaknesses":           score.weaknesses,
            "missing_points":       score.missing_points,
            "improved_answer":      score.improved_answer,
            "filler_words":         score.filler_detected,
        },
        "communication": comm_analysis,
        "reaction": {
            "spoken_text":      reaction["spoken_text"],
            "should_escalate":  reaction.get("should_escalate", False),
            "escalation_warning": reaction.get("escalation_warning"),
        },
        "follow_up_turn": followup_turn,
        "session_progress": {
            "answered": sum(1 for t in session.turns if t.answer_text),
            "total":    len(session.turns),
        }
    }


@interview_router.post("/session/{session_id}/report")
def get_report(session_id: str):
    from agents.interview_v2.session_manager import generate_report
    return generate_report(session_id)


@interview_router.get("/sessions")
def list_all_sessions():
    from agents.interview_v2.session_manager import list_sessions
    return list_sessions()


# ── Speech Endpoints ──────────────────────────────────────────────────────────

@interview_router.get("/speech/status")
def speech_status():
    from speech.pipeline import check_speech_pipeline
    return check_speech_pipeline()


@interview_router.post("/speech/speak")
def tts_speak(req: SpeakRequest):
    """Convert text to speech, return WAV audio bytes as base64."""
    from speech.pipeline import speak_to_bytes
    audio = speak_to_bytes(req.text)
    if audio:
        return {
            "audio_base64": base64.b64encode(audio).decode(),
            "format": "wav",
            "text": req.text,
        }
    return {"audio_base64": None, "error": "TTS unavailable", "text": req.text}


@interview_router.post("/speech/transcribe")
async def stt_transcribe(req: TranscribeRequest):
    """Transcribe base64-encoded WAV audio to text via Whisper."""
    from speech.pipeline import transcribe
    try:
        audio_bytes = base64.b64decode(req.audio_base64)
        text, confidence = transcribe(audio_bytes)
        return {"transcript": text, "confidence": confidence}
    except Exception as e:
        raise HTTPException(500, f"Transcription failed: {e}")


@interview_router.post("/speech/transcribe/file")
async def stt_transcribe_file(file: UploadFile = File(...)):
    """Transcribe uploaded audio file."""
    from speech.pipeline import transcribe
    audio_bytes = await file.read()
    text, confidence = transcribe(audio_bytes)
    return {"transcript": text, "confidence": confidence}


# ── WebSocket: Real-time session ──────────────────────────────────────────────

@interview_router.websocket("/ws/session/{session_id}")
async def websocket_session(websocket: WebSocket, session_id: str):
    """
    Real-time interview session over WebSocket.

    Message protocol:
      Client → Server:
        {"type": "start"}
        {"type": "answer", "turn_id": 1, "text": "...", "duration": 45.0}
        {"type": "audio", "turn_id": 1, "audio_base64": "...", "duration": 45.0}
        {"type": "end_session"}

      Server → Client:
        {"type": "opening",  "persona": "...", "text": "..."}
        {"type": "question", "turn_id": 1, "spoken_text": "...", "time_limit": 90, ...}
        {"type": "evaluation", "turn_id": 1, "score": ..., "feedback": "...", ...}
        {"type": "reaction", "spoken_text": "...", "escalation": false}
        {"type": "followup", "turn_id": 2, "question": "..."}
        {"type": "session_complete", "report_ready": true}
        {"type": "error", "message": "..."}
    """
    await websocket.accept()

    from agents.interview_v2.session_manager import load_session, record_answer as _record, add_followup_turn, generate_report
    from agents.interview_v2.answer_evaluator import evaluate_answer
    from agents.interview_v2.pressure_engine import PressureEngine
    from speech.pipeline import transcribe as stt_transcribe

    import asyncio

    session = load_session(session_id)
    if not session:
        await websocket.send_json({"type": "error", "message": "Session not found"})
        await websocket.close()
        return

    engine = PressureEngine(session_id, session.difficulty_level)

    try:
        # Wait for start signal
        msg = await websocket.receive_json()
        if msg.get("type") != "start":
            await websocket.send_json({"type": "error", "message": "Send {type: start} first"})
            return

        # Send opening
        opening = engine.get_opening_message()
        await websocket.send_json({"type": "opening", **opening})

        # Loop through turns
        for turn in session.turns:
            # Send question
            framed = engine.ask_question(
                {"id": turn.question_id, "question": turn.question_text,
                 "difficulty": turn.difficulty, "expected_answer_framework": turn.expected_framework,
                 "good_answer_covers": turn.rubric},
                turn.question_type,
            )
            await websocket.send_json({
                "type":           "question",
                "turn_id":        turn.turn_id,
                "spoken_text":    framed["spoken_text"],
                "raw_question":   turn.question_text,
                "time_limit":     framed.get("time_limit", 90),
                "think_time":     framed.get("think_time", 30),
                "category":       turn.category,
                "difficulty":     turn.difficulty,
                "framework":      turn.expected_framework,
                "questions_left": sum(1 for t in session.turns if not t.answer_text),
            })

            # Wait for answer
            msg = await websocket.receive_json()
            if msg.get("type") == "end_session":
                break

            answer_text   = ""
            duration_sec  = msg.get("duration", 0.0)
            is_transcript = False

            if msg.get("type") == "audio":
                audio = base64.b64decode(msg["audio_base64"])
                answer_text, _ = stt_transcribe(audio)
                is_transcript = True
                await websocket.send_json({"type": "transcript", "text": answer_text, "turn_id": turn.turn_id})
            elif msg.get("type") == "answer":
                answer_text = msg.get("text", "")

            # Evaluate
            score = evaluate_answer(
                question           = turn.question_text,
                answer             = answer_text,
                expected_framework = turn.expected_framework,
                good_answer_covers = turn.rubric,
                difficulty         = turn.difficulty,
                is_transcript      = is_transcript,
            )

            # Store
            score_dict = {
                "scores": {k: getattr(score, k) for k in ["knowledge_depth","communication","framework_adherence","confidence_signals","completeness"]},
                "overall": score.overall, "feedback": score.feedback,
                "strengths": score.strengths, "weaknesses": score.weaknesses,
                "missing_points": score.missing_points, "improved_answer": score.improved_answer,
                "filler_detected": score.filler_detected, "follow_up_triggered": score.follow_up_triggered,
            }
            _record(session_id, turn.turn_id, answer_text, duration_sec, score_dict)

            # Send evaluation
            await websocket.send_json({
                "type":            "evaluation",
                "turn_id":         turn.turn_id,
                "overall_score":   score.overall,
                "scores":          score_dict["scores"],
                "feedback":        score.feedback,
                "strengths":       score.strengths[:2],
                "weaknesses":      score.weaknesses[:2],
                "missing_points":  score.missing_points[:2],
                "improved_answer": score.improved_answer,
                "filler_words":    score.filler_detected,
            })

            # Send reaction
            reaction = engine.react_to_answer(answer_text, score.overall,
                score.follow_up_question if score.follow_up_triggered else None)
            await websocket.send_json({
                "type":         "reaction",
                "spoken_text":  reaction["spoken_text"],
                "escalation":   reaction.get("should_escalate", False),
            })

            # Handle escalation
            if reaction.get("should_escalate"):
                esc = engine.escalate()
                if esc.get("escalated"):
                    await websocket.send_json({"type": "escalation", **esc})

            # Send follow-up if triggered
            if score.follow_up_triggered and score.follow_up_question:
                ft = add_followup_turn(session_id, turn.turn_id, score.follow_up_question, engine.current_persona["name"])
                if ft:
                    await websocket.send_json({
                        "type": "followup_added",
                        "turn_id": ft.turn_id,
                        "question": ft.question_text,
                    })

        # Session complete
        closing = engine.close_session()
        await websocket.send_json({"type": "closing", **closing})
        await websocket.send_json({"type": "session_complete", "report_ready": True, "session_id": session_id})

    except WebSocketDisconnect:
        print(f"[WS] Session {session_id} disconnected")
    except Exception as e:
        await websocket.send_json({"type": "error", "message": str(e)})