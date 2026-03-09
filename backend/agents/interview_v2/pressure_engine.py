# backend/agents/interview_v2/pressure_engine.py
"""
Pressure Simulation Engine
===========================
Manages interview difficulty levels 1-5.

Level 1 — Warm-up
  Friendly interviewer, open-ended, no follow-ups, long think time (120s)

Level 2 — Standard
  Neutral tone, occasional follow-ups, STAR expected, 90s per answer

Level 3 — Technical Deep Dive
  Probing follow-ups, "why not X?", expects specific numbers, 60s

Level 4 — Stress Test
  Hostile, challenges every answer, "prove it", "that's wrong", 45s

Level 5 — Panel + Rapid Fire
  3 personas in sequence, 30s per answer, unexpected curveballs
"""

import os
import json
import re
from huggingface_hub import InferenceClient
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from memory.store import get_profile

client = InferenceClient(api_key=os.environ.get("HF_TOKEN"))


# ── Interviewer Personas ───────────────────────────────────────────────────────

PERSONAS = {
    "friendly": {
        "name": "Dr. Priya",
        "title": "Senior Research Scientist",
        "style": "warm, encouraging, patient",
        "system": """You are Dr. Priya, a warm and supportive research scientist conducting a friendly interview.
You're genuinely interested in the candidate's work. Ask open-ended questions.
Never interrupt. Give the candidate time to think.
After their answer, gently probe for more detail.
Speak naturally and conversationally. Use phrases like "That's interesting, can you tell me more about..."
Keep questions focused on one thing at a time.""",
    },

    "neutral": {
        "name": "Rahul",
        "title": "Engineering Manager",
        "style": "professional, direct, methodical",
        "system": """You are Rahul, a professional engineering manager doing a standard technical interview.
You are neutral — neither warm nor cold. You expect structured, complete answers.
Follow up if the answer is incomplete. Challenge vague claims with "can you be more specific?"
If they use a framework wrong, point it out. Expect STAR for behavioral questions.
You evaluate systematically and have a checklist.""",
    },

    "technical": {
        "name": "Vikram",
        "title": "Principal ML Researcher",
        "style": "deeply technical, expects precision",
        "system": """You are Vikram, a principal ML researcher who knows the field extremely well.
You expect technical precision. Vague answers get "can you be more specific?"
You ask "why not X instead of Y?" when you suspect the candidate chose wrong.
You probe architecture decisions, complexity tradeoffs, failure modes.
You expect numbers: model size, latency, accuracy, dataset size.
You have zero tolerance for buzzwords without substance.""",
    },

    "hostile": {
        "name": "Ananya",
        "title": "Director of Engineering",
        "style": "skeptical, challenging, stress-testing",
        "system": """You are Ananya, a demanding Director who stress-tests every candidate.
You challenge assumptions aggressively. When they say something, you push back.
Use phrases like:
- "That's a poor design choice. Defend it."
- "I'm not convinced. Give me a better reason."
- "Every candidate says that. What makes YOU different?"
- "Your approach would fail at scale. Why didn't you think of that?"
You're not cruel — you're testing resilience and whether they can think under pressure.
If they handle it well, acknowledge it briefly and move on.""",
    },

    "panel_tech": {
        "name": "Sanjay",
        "title": "Tech Lead",
        "style": "algorithmic focus, leetcode-style",
        "system": """You are Sanjay, a tech lead focused on algorithms, data structures, and ML fundamentals.
Ask about time/space complexity. Ask for optimal solutions. 
Probe edge cases. Ask them to code solutions verbally.
If they get something wrong, correct them and ask why they made that mistake.""",
    },

    "panel_culture": {
        "name": "Meera",
        "title": "Head of People",
        "style": "culture fit, values, collaboration",
        "system": """You are Meera, Head of People, assessing culture fit and collaboration skills.
Ask about conflict resolution, feedback, failure, and working with difficult teammates.
Probe for specific situations, not hypotheticals.
Flag candidates who take zero accountability or blame others.""",
    },
}


# ── Difficulty Config ──────────────────────────────────────────────────────────

DIFFICULTY_CONFIG = {
    1: {
        "name": "Warm-Up",
        "description": "Friendly, open-ended, no pressure",
        "personas": ["friendly"],
        "think_time_seconds": 120,
        "answer_time_seconds": 300,
        "follow_up_probability": 0.2,
        "stress_follow_up_probability": 0.0,
        "question_categories": ["behavioral", "project_deep_dive"],
        "max_difficulty_questions": 2,
        "tone_instructions": "Be encouraging. Celebrate good answers.",
    },
    2: {
        "name": "Standard",
        "description": "Neutral professional interview",
        "personas": ["neutral"],
        "think_time_seconds": 90,
        "answer_time_seconds": 180,
        "follow_up_probability": 0.5,
        "stress_follow_up_probability": 0.1,
        "question_categories": ["behavioral", "project_deep_dive", "skill_probe"],
        "max_difficulty_questions": 3,
        "tone_instructions": "Be professional. Follow up on incomplete answers.",
    },
    3: {
        "name": "Technical Deep Dive",
        "description": "Probing technical questions and follow-ups",
        "personas": ["technical"],
        "think_time_seconds": 60,
        "answer_time_seconds": 120,
        "follow_up_probability": 0.8,
        "stress_follow_up_probability": 0.3,
        "question_categories": ["skill_probe", "system_design", "algorithm_ml", "project_deep_dive"],
        "max_difficulty_questions": 5,
        "tone_instructions": "Always ask why. Probe for specifics. Expect numbers.",
    },
    4: {
        "name": "Stress Test",
        "description": "Hostile interviewer who challenges everything",
        "personas": ["hostile"],
        "think_time_seconds": 45,
        "answer_time_seconds": 90,
        "follow_up_probability": 1.0,
        "stress_follow_up_probability": 0.8,
        "question_categories": ["skill_probe", "system_design", "algorithm_ml", "stress_test"],
        "max_difficulty_questions": 5,
        "tone_instructions": "Challenge every answer. Use stress variants. Push back on vague claims.",
    },
    5: {
        "name": "Panel + Rapid Fire",
        "description": "3 interviewers, 30s per answer, curveballs",
        "personas": ["technical", "hostile", "panel_culture"],
        "think_time_seconds": 15,
        "answer_time_seconds": 30,
        "follow_up_probability": 1.0,
        "stress_follow_up_probability": 1.0,
        "question_categories": ["skill_probe", "system_design", "algorithm_ml", "behavioral", "stress_test"],
        "max_difficulty_questions": 5,
        "tone_instructions": "Rapid fire mode. Short, direct questions. No pleasantries.",
    },
}


@dataclass
class InterviewTurn:
    turn_id:        int
    persona:        str
    question:       str
    question_id:    str
    question_type:  str   # original / follow_up / stress / curveball
    time_limit:     int   # seconds
    think_time:     int   # seconds allowed before answering
    difficulty:     int


@dataclass
class SessionState:
    session_id:       str
    difficulty_level: int
    current_turn:     int = 0
    turns:            List[InterviewTurn] = field(default_factory=list)
    answers:          List[Dict] = field(default_factory=list)
    current_persona_idx: int = 0
    escalation_triggered: bool = False
    consecutive_weak_answers: int = 0


# ── Pressure Engine ────────────────────────────────────────────────────────────

class PressureEngine:
    """
    Manages a live interview session with escalating difficulty.
    Maintains conversation history and adapts based on answer quality.
    """

    def __init__(self, session_id: str, difficulty_level: int):
        self.session_id    = session_id
        self.difficulty    = difficulty_level
        self.config        = DIFFICULTY_CONFIG[difficulty_level]
        self.profile       = get_profile()
        self.history: List[Dict] = []   # full conversation history for context
        self.turn_count    = 0
        self.weak_answers  = 0  # consecutive weak answers → escalate
        self.current_persona = PERSONAS[self.config["personas"][0]]

    def get_opening_message(self) -> Dict:
        """Generate the interviewer's opening statement."""
        persona = self.current_persona
        config  = self.config

        response = client.chat.completions.create(
            model="Qwen/Qwen2.5-72B-Instruct",
            max_tokens=300,
            messages=[
                {"role": "system", "content": persona["system"]},
                {
                    "role": "user",
                    "content": f"""You're about to interview {self.profile['name']} for a technical role.
Difficulty level: {self.difficulty} ({config['name']}).
Generate a natural opening statement (2-3 sentences).
Introduce yourself briefly, set expectations for the interview.
Do NOT ask a question yet. Just open the session.
Return ONLY the spoken text, no JSON."""
                }
            ]
        )
        text = response.choices[0].message.content.strip()
        self.history.append({"role": "assistant", "content": text})
        return {
            "type": "opening",
            "persona": persona["name"],
            "persona_title": persona["title"],
            "text": text,
            "difficulty": self.difficulty,
            "config": {
                "name": config["name"],
                "think_time": config["think_time_seconds"],
                "answer_time": config["answer_time_seconds"],
            }
        }

    def ask_question(self, question: Dict, question_type: str = "original") -> Dict:
        """
        Frame a question through the current interviewer persona.
        Returns the spoken question text.
        """
        self.turn_count += 1
        persona = self.current_persona
        config  = self.config

        # Build context for the persona
        context = f"""
Question to ask (rephrase it naturally in your voice):
{question.get('question', '')}

Question type: {question_type}
Difficulty: {question.get('difficulty', 3)}/5

Previous conversation context: {len(self.history)} turns so far.

Return ONLY the spoken question text. Sound natural. 1-3 sentences max.
Add pressure framing if this is a stress question (level 4+).
"""
        self.history.append({"role": "user", "content": context})

        response = client.chat.completions.create(
            model="Qwen/Qwen2.5-72B-Instruct",
            max_tokens=200,
            messages=[{"role": "system", "content": persona["system"]}] + self.history[-6:]
        )

        spoken = response.choices[0].message.content.strip()
        self.history.append({"role": "assistant", "content": spoken})

        return {
            "type": "question",
            "turn": self.turn_count,
            "persona": persona["name"],
            "persona_title": persona["title"],
            "question_id": question.get("id", f"q_{self.turn_count}"),
            "spoken_text": spoken,
            "raw_question": question.get("question", ""),
            "time_limit": config["answer_time_seconds"],
            "think_time": config["think_time_seconds"],
            "expected_framework": question.get("expected_answer_framework", "technical_explanation"),
            "rubric": question.get("good_answer_covers", []),
        }

    def react_to_answer(
        self,
        answer_text: str,
        score: float,
        follow_up_question: Optional[str] = None,
    ) -> Dict:
        """
        Generate interviewer reaction to a candidate's answer.
        Calibrated to difficulty level and answer quality.
        """
        persona = self.current_persona

        # Track weak answers for escalation
        if score < 5.0:
            self.weak_answers += 1
        else:
            self.weak_answers = max(0, self.weak_answers - 1)

        reaction_prompt = f"""
Candidate just answered. Score: {score:.1f}/10.
Difficulty level: {self.difficulty}.
Consecutive weak answers: {self.weak_answers}.

Candidate said: "{answer_text[:500]}"

{"Follow-up question to ask: " + follow_up_question if follow_up_question else "No follow-up needed."}

Generate a natural reaction (1-2 sentences) then either:
- Ask the follow-up if provided
- Move on if answer was strong
- Challenge if answer was weak (level 3+)
- Escalate pressure if {self.weak_answers} consecutive weak answers

Return ONLY the spoken text."""

        self.history.append({"role": "user", "content": f"[Candidate answered: {answer_text[:300]}]"})

        response = client.chat.completions.create(
            model="Qwen/Qwen2.5-72B-Instruct",
            max_tokens=300,
            messages=[{"role": "system", "content": persona["system"]}] + self.history[-8:]
        )

        spoken = response.choices[0].message.content.strip()
        self.history.append({"role": "assistant", "content": spoken})

        # Check if we should escalate difficulty
        should_escalate = (
            self.weak_answers >= 3 and
            self.difficulty < 5 and
            not self.config.get("escalation_done", False)
        )

        return {
            "type": "reaction",
            "persona": persona["name"],
            "spoken_text": spoken,
            "score_given": score,
            "should_escalate": should_escalate,
            "escalation_warning": "Difficulty increasing..." if should_escalate else None,
        }

    def escalate(self) -> Dict:
        """
        Escalate to next difficulty level mid-session.
        Returns new config and announcement.
        """
        if self.difficulty >= 5:
            return {"escalated": False}

        self.difficulty += 1
        self.config = DIFFICULTY_CONFIG[self.difficulty]
        new_persona_key = self.config["personas"][0]
        self.current_persona = PERSONAS[new_persona_key]
        self.config["escalation_done"] = True

        return {
            "escalated": True,
            "new_level": self.difficulty,
            "new_level_name": self.config["name"],
            "new_persona": self.current_persona["name"],
            "announcement": f"[Difficulty increased to Level {self.difficulty}: {self.config['name']}]",
        }

    def switch_panel_persona(self) -> str:
        """For Level 5: rotate through panel personas."""
        personas = self.config["personas"]
        next_idx = (self.turn_count % len(personas))
        self.current_persona = PERSONAS[personas[next_idx]]
        return self.current_persona["name"]

    def close_session(self) -> Dict:
        """Generate closing statement from interviewer."""
        response = client.chat.completions.create(
            model="Qwen/Qwen2.5-72B-Instruct",
            max_tokens=200,
            messages=[
                {"role": "system", "content": self.current_persona["system"]},
                {
                    "role": "user",
                    "content": "Close the interview session professionally. 2 sentences. Thank the candidate, tell them next steps. Return ONLY the spoken text."
                }
            ]
        )
        return {
            "type": "closing",
            "persona": self.current_persona["name"],
            "spoken_text": response.choices[0].message.content.strip(),
        }
