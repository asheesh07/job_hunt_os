# backend/agents/interview_v2/session_manager.py
"""
Interview Session Manager
==========================
Manages the full lifecycle of a mock interview session:
  - Session creation (pick questions, set difficulty)
  - Turn-by-turn state tracking
  - Answer storage with scores
  - Transcript building
  - Final report generation

Sessions are persisted to disk so they survive server restarts.
"""

import json
import os
import time
import re
import secrets
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, field, asdict

from huggingface_hub import InferenceClient

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "sessions")
os.makedirs(DATA_DIR, exist_ok=True)

client = InferenceClient(api_key=os.environ.get("HF_TOKEN"))


@dataclass
class QuestionTurn:
    turn_id:             int
    question_id:         str
    question_text:       str
    question_type:       str        # original/follow_up/stress/curveball
    category:            str
    difficulty:          int
    expected_framework:  str
    rubric:              List[str]
    persona:             str
    time_limit:          int
    # filled after answer
    answer_text:         str = ""
    answer_duration_sec: float = 0.0
    scores:              Dict = field(default_factory=dict)
    feedback:            str = ""
    strengths:           List[str] = field(default_factory=list)
    weaknesses:          List[str] = field(default_factory=list)
    missing_points:      List[str] = field(default_factory=list)
    filler_words:        List[str] = field(default_factory=list)
    improved_answer:     str = ""
    follow_up_triggered: bool = False
    overall_score:       float = 0.0


@dataclass
class InterviewSession:
    session_id:       str
    created_at:       str
    candidate_name:   str
    difficulty_level: int
    mode:             str        # "resume" / "jd" / "merged"
    company:          str = ""
    role:             str = ""
    status:           str = "created"  # created/active/completed
    turns:            List[QuestionTurn] = field(default_factory=list)
    # aggregated after session
    total_turns:      int = 0
    avg_score:        float = 0.0
    session_duration_sec: float = 0.0
    final_report:     Dict = field(default_factory=dict)
    transcript:       str = ""


# ── Persistence ────────────────────────────────────────────────────────────────

def _session_path(session_id: str) -> str:
    return os.path.join(DATA_DIR, f"{session_id}.json")

def save_session(session: InterviewSession):
    with open(_session_path(session.session_id), "w") as f:
        json.dump(asdict(session), f, indent=2, default=str)

def load_session(session_id: str) -> Optional[InterviewSession]:
    p = _session_path(session_id)
    if not os.path.exists(p):
        return None
    with open(p) as f:
        data = json.load(f)
    # Reconstruct dataclasses
    data["turns"] = [QuestionTurn(**t) for t in data.get("turns", [])]
    return InterviewSession(**data)

def list_sessions() -> List[Dict]:
    sessions = []
    for fname in sorted(os.listdir(DATA_DIR), reverse=True):
        if fname.endswith(".json"):
            try:
                with open(os.path.join(DATA_DIR, fname)) as f:
                    data = json.load(f)
                sessions.append({
                    "session_id":      data["session_id"],
                    "created_at":      data["created_at"],
                    "status":          data["status"],
                    "difficulty_level": data["difficulty_level"],
                    "mode":            data["mode"],
                    "company":         data.get("company", ""),
                    "role":            data.get("role", ""),
                    "avg_score":       data.get("avg_score", 0),
                    "total_turns":     data.get("total_turns", 0),
                })
            except Exception:
                pass
    return sessions


# ── Session Factory ────────────────────────────────────────────────────────────

def create_session(
    difficulty_level: int,
    mode: str,
    question_bank: Dict,
    company: str = "",
    role: str = "",
    candidate_name: str = "Asheesh",
    num_questions: int = 8,
) -> InterviewSession:
    """
    Create a new session, select questions based on difficulty config,
    and save to disk.
    """
    from agents.interview_v2.pressure_engine import DIFFICULTY_CONFIG

    session_id = f"sess_{secrets.token_hex(6)}"
    config     = DIFFICULTY_CONFIG[difficulty_level]

    # Select questions from bank
    selected_turns = _select_questions(
        question_bank, config, num_questions, difficulty_level
    )

    session = InterviewSession(
        session_id       = session_id,
        created_at       = datetime.now().isoformat(),
        candidate_name   = candidate_name,
        difficulty_level = difficulty_level,
        mode             = mode,
        company          = company,
        role             = role,
        status           = "created",
        turns            = selected_turns,
    )

    save_session(session)
    return session


def _select_questions(
    bank: Dict,
    config: Dict,
    num_questions: int,
    difficulty: int,
) -> List[QuestionTurn]:
    """
    Select and order questions from the bank based on difficulty config.
    Starts with lower difficulty questions, escalates.
    """
    from agents.interview_v2.pressure_engine import PERSONAS

    categories = config["question_categories"]
    persona    = PERSONAS[config["personas"][0]]
    turns: List[QuestionTurn] = []
    turn_id = 1

    # Flatten all questions from bank
    all_questions = []

    # Resume bank format
    if "categories" in bank:
        for cat, questions in bank["categories"].items():
            if cat in categories or not categories:
                for q in (questions or []):
                    all_questions.append((cat, q))

    # JD bank format
    if "questions" in bank:
        for q in bank["questions"]:
            cat = q.get("category", "skill_probe")
            if cat in categories or not categories:
                all_questions.append((cat, q))

    # Sort by difficulty ascending (warm up first)
    all_questions.sort(key=lambda x: x[1].get("difficulty", 3))

    # Cap max difficulty by level
    max_diff = config.get("max_difficulty_questions", 5)
    all_questions = [
        (cat, q) for cat, q in all_questions
        if q.get("difficulty", 3) <= max_diff
    ]

    # Take num_questions, spread across difficulties
    selected = _spread_difficulty(all_questions, num_questions)

    for cat, q in selected:
        turns.append(QuestionTurn(
            turn_id             = turn_id,
            question_id         = q.get("id", f"q_{turn_id}"),
            question_text       = q.get("question", ""),
            question_type       = "original",
            category            = cat,
            difficulty          = q.get("difficulty", 3),
            expected_framework  = q.get("expected_answer_framework", "technical_explanation"),
            rubric              = q.get("good_answer_covers", []),
            persona             = persona["name"],
            time_limit          = config["answer_time_seconds"],
        ))
        turn_id += 1

    return turns


def _spread_difficulty(questions: List, n: int) -> List:
    """Select n questions spread across difficulty levels 1-5."""
    by_diff = {}
    for item in questions:
        d = item[1].get("difficulty", 3)
        by_diff.setdefault(d, []).append(item)

    selected = []
    diffs = sorted(by_diff.keys())
    per_diff = max(1, n // len(diffs)) if diffs else n

    for d in diffs:
        selected.extend(by_diff[d][:per_diff])
        if len(selected) >= n:
            break

    return selected[:n]


# ── Turn Management ───────────────────────────────────────────────────────────

def record_answer(
    session_id: str,
    turn_id: int,
    answer_text: str,
    duration_sec: float,
    score_data: Dict,
) -> Optional[QuestionTurn]:
    """
    Store a candidate's answer and evaluation scores for a turn.
    """
    session = load_session(session_id)
    if not session:
        return None

    for turn in session.turns:
        if turn.turn_id == turn_id:
            turn.answer_text         = answer_text
            turn.answer_duration_sec = duration_sec
            turn.scores              = score_data.get("scores", {})
            turn.feedback            = score_data.get("feedback", "")
            turn.strengths           = score_data.get("strengths", [])
            turn.weaknesses          = score_data.get("weaknesses", [])
            turn.missing_points      = score_data.get("missing_points", [])
            turn.improved_answer     = score_data.get("improved_answer", "")
            turn.filler_words        = score_data.get("filler_detected", [])
            turn.follow_up_triggered = score_data.get("follow_up_triggered", False)
            turn.overall_score       = score_data.get("overall", 0.0)
            break

    save_session(session)
    return next((t for t in session.turns if t.turn_id == turn_id), None)


def add_followup_turn(
    session_id: str,
    after_turn_id: int,
    follow_up_question: str,
    persona: str,
) -> Optional[QuestionTurn]:
    """Add a follow-up question turn to the session."""
    session = load_session(session_id)
    if not session:
        return None

    new_turn = QuestionTurn(
        turn_id            = max(t.turn_id for t in session.turns) + 1,
        question_id        = f"followup_{after_turn_id}",
        question_text      = follow_up_question,
        question_type      = "follow_up",
        category           = "follow_up",
        difficulty         = min(5, session.difficulty_level + 1),
        expected_framework = "technical_explanation",
        rubric             = [],
        persona            = persona,
        time_limit         = session.turns[0].time_limit if session.turns else 90,
    )
    session.turns.append(new_turn)
    save_session(session)
    return new_turn


# ── Report Generation ─────────────────────────────────────────────────────────

def generate_report(session_id: str) -> Dict:
    """
    Generate comprehensive post-session report:
    - Score breakdown per question and dimension
    - Annotated transcript
    - Top 3 strengths and weaknesses
    - Specific improvement plan
    - Comparison to ideal answers
    """
    session = load_session(session_id)
    if not session:
        return {"error": "Session not found"}

    answered_turns = [t for t in session.turns if t.answer_text]
    if not answered_turns:
        return {"error": "No answers recorded"}

    # Aggregate scores
    dim_scores = {}
    dim_names = ["knowledge_depth", "communication", "framework_adherence", "confidence_signals", "completeness"]
    for dim in dim_names:
        vals = [t.scores.get(dim, 0) for t in answered_turns if t.scores]
        dim_scores[dim] = round(sum(vals) / len(vals), 1) if vals else 0.0

    overall_scores = [t.overall_score for t in answered_turns if t.overall_score > 0]
    avg_overall    = round(sum(overall_scores) / len(overall_scores), 1) if overall_scores else 0.0

    # Build annotated transcript
    transcript_lines = []
    for turn in answered_turns:
        transcript_lines.append(f"\n--- Turn {turn.turn_id} | {turn.category} | Difficulty {turn.difficulty}/5 ---")
        transcript_lines.append(f"[{turn.persona}]: {turn.question_text}")
        transcript_lines.append(f"[{session.candidate_name}]: {turn.answer_text}")
        transcript_lines.append(f"[Score: {turn.overall_score:.1f}/10] {turn.feedback}")
        if turn.missing_points:
            transcript_lines.append(f"[Missed]: {', '.join(turn.missing_points[:2])}")
        if turn.filler_words:
            transcript_lines.append(f"[Fillers detected]: {', '.join(set(turn.filler_words))}")
        transcript_lines.append(f"[Better answer]: {turn.improved_answer[:200]}...")

    transcript = "\n".join(transcript_lines)

    # LLM synthesis for improvement plan
    synthesis_prompt = f"""
Interview session results for {session.candidate_name}:
Company: {session.company}, Role: {session.role}
Difficulty: {session.difficulty_level}/5
Total questions answered: {len(answered_turns)}
Average score: {avg_overall}/10

Per-dimension scores: {json.dumps(dim_scores, indent=2)}

Weak answers summary:
{chr(10).join(f'Q{t.turn_id}: {t.question_text[:80]} → Score {t.overall_score:.1f}/10. Weaknesses: {t.weaknesses[:2]}' for t in answered_turns if t.overall_score < 6)}

Strong answers:
{chr(10).join(f'Q{t.turn_id}: {t.question_text[:80]} → Score {t.overall_score:.1f}/10' for t in answered_turns if t.overall_score >= 7)}

Generate a comprehensive improvement plan. Return JSON:
{{
  "overall_grade": "A/B/C/D/F",
  "hire_recommendation": "Strong Hire / Hire / No Hire / Strong No Hire",
  "top_strengths": ["specific strength with example", "strength 2", "strength 3"],
  "critical_weaknesses": ["specific weakness with which question exposed it", "weakness 2"],
  "dimension_analysis": {{
    "knowledge_depth": "paragraph on technical knowledge quality",
    "communication": "paragraph on how they communicated",
    "framework_adherence": "did they use STAR/tradeoffs correctly?",
    "confidence": "did they sound confident or uncertain?"
  }},
  "improvement_plan": [
    {{
      "priority": 1,
      "area": "...",
      "current_issue": "...",
      "specific_action": "...",
      "practice_exercise": "...",
      "timeline": "1 week / 2 weeks / 1 month"
    }}
  ],
  "questions_to_practice_again": ["question 1", "question 2"],
  "ready_for_real_interview": true/false,
  "readiness_note": "honest one-paragraph assessment"
}}
"""

    response = client.chat.completions.create(
        model="Qwen/Qwen2.5-72B-Instruct",
        max_tokens=2500,
        messages=[{"role": "user", "content": synthesis_prompt}]
    )
    text  = response.choices[0].message.content.replace("```json", "").replace("```", "").strip()
    match = re.search(r'\{[\s\S]*\}', text)
    synthesis = json.loads(match.group()) if match else {}

    report = {
        "session_id":          session_id,
        "candidate":           session.candidate_name,
        "company":             session.company,
        "role":                session.role,
        "difficulty_level":    session.difficulty_level,
        "questions_answered":  len(answered_turns),
        "avg_overall_score":   avg_overall,
        "dimension_scores":    dim_scores,
        "annotated_transcript": transcript,
        "synthesis":           synthesis,
        "per_question_scores": [
            {
                "turn":     t.turn_id,
                "question": t.question_text[:80],
                "score":    t.overall_score,
                "category": t.category,
                "difficulty": t.difficulty,
            }
            for t in answered_turns
        ],
        "filler_word_count": sum(len(t.filler_words) for t in answered_turns),
        "generated_at": datetime.now().isoformat(),
    }

    # Update session with report
    session.final_report      = report
    session.transcript        = transcript
    session.avg_score         = avg_overall
    session.total_turns       = len(answered_turns)
    session.status            = "completed"
    save_session(session)

    return report
