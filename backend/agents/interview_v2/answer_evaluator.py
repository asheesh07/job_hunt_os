# backend/agents/interview_v2/answer_evaluator.py
"""
Answer Evaluation Engine
=========================
Evaluates a candidate's answer against the question's expected rubric.

Scores:
  - knowledge_depth      (0-10): technical accuracy and completeness
  - communication        (0-10): clarity, conciseness, structure
  - framework_adherence  (0-10): STAR / technical explanation / tradeoff usage
  - confidence_signals   (0-10): definitive statements, no filler
  - completeness         (0-10): covers all expected points

Also detects:
  - filler words (um, uh, basically, you know, like, sort of)
  - vague claims ("we built something", "it was complex")
  - missing specifics (no numbers, no metrics, no concrete examples)
  - buzzword abuse (overuse of "innovative", "scalable", "robust")
"""

import os
import re
from huggingface_hub import InferenceClient
from typing import Dict, List, Optional
from dataclasses import dataclass

client = InferenceClient(api_key=os.environ.get("HF_TOKEN"))

EVAL_SYSTEM = """You are a world-class interview evaluator at a top AI research lab.
Evaluate candidate answers with surgical precision.

Be honest and specific. Weak answers get low scores.
Always cite exact phrases from the answer in your feedback.
Never give generic feedback like "good job" or "could be better".

Respond ONLY with valid JSON."""


FILLER_WORDS = [
    "um", "uh", "like", "you know", "basically", "literally", "actually",
    "sort of", "kind of", "i mean", "right", "so yeah", "stuff like that",
    "and whatnot", "et cetera", "things like that", "basically what i did",
]

VAGUE_PHRASES = [
    "we built", "we made", "we did", "it was complex", "it was challenging",
    "many things", "various things", "different approaches", "something like",
    "i worked on", "i was involved in", "i contributed to",
]


@dataclass
class AnswerScore:
    knowledge_depth:     int   # 0-10
    communication:       int   # 0-10
    framework_adherence: int   # 0-10
    confidence_signals:  int   # 0-10
    completeness:        int   # 0-10
    overall:             float # weighted average

    feedback:            str   # specific actionable feedback
    strengths:           List[str]
    weaknesses:          List[str]
    missing_points:      List[str]  # from rubric not covered
    filler_detected:     List[str]
    vague_phrases:       List[str]
    improved_answer:     str   # how the answer should have been said
    follow_up_triggered: bool  # should interviewer dig deeper?
    follow_up_question:  Optional[str]


def detect_fillers(answer_text: str) -> List[str]:
    """Detect filler words and vague phrases in answer."""
    text_lower = answer_text.lower()
    found_fillers = [f for f in FILLER_WORDS  if f in text_lower]
    found_vague   = [v for v in VAGUE_PHRASES if v in text_lower]
    return found_fillers + found_vague


def evaluate_answer(
    question: str,
    answer: str,
    expected_framework: str,
    good_answer_covers: List[str],
    difficulty: int = 3,
    is_transcript: bool = False,
) -> AnswerScore:
    """
    Full evaluation of a candidate's answer.

    Args:
        question:           The question that was asked
        answer:             Candidate's answer (text or transcript)
        expected_framework: "STAR" | "technical_explanation" | "tradeoff_analysis"
        good_answer_covers: rubric points a good answer should include
        difficulty:         1-5 (affects scoring calibration)
        is_transcript:      if True, apply speech-specific analysis (fillers, pace)
    """

    fillers_found = detect_fillers(answer) if is_transcript else []

    prompt = f"""
Evaluate this interview answer:

QUESTION: {question}
EXPECTED FRAMEWORK: {expected_framework}
DIFFICULTY: {difficulty}/5
RUBRIC (good answer should cover): {json_list(good_answer_covers)}

CANDIDATE ANSWER:
{answer}

{"FILLERS DETECTED IN SPEECH: " + str(fillers_found) if fillers_found else ""}

Return JSON:
{{
  "scores": {{
    "knowledge_depth":     <0-10>,
    "communication":       <0-10>,
    "framework_adherence": <0-10>,
    "confidence_signals":  <0-10>,
    "completeness":        <0-10>
  }},
  "feedback": "2-3 sentences of specific, actionable feedback citing exact phrases from the answer",
  "strengths": ["specific strength 1 with quote", "strength 2"],
  "weaknesses": ["specific weakness 1 with quote", "weakness 2"],
  "missing_points": ["rubric point not covered 1", "rubric point 2"],
  "improved_answer": "How this answer should have been structured and what it should have said (3-5 sentences, using STAR/technical framework correctly)",
  "follow_up_triggered": true/false,
  "follow_up_question": "next question to ask if follow_up_triggered is true, else null",
  "communication_notes": {{
    "clarity": "was the answer easy to follow?",
    "structure": "did they use a clear framework?",
    "specificity": "did they give concrete examples and metrics?",
    "pacing": "was it too brief or too rambling?"
  }}
}}
"""

    response = client.chat.completions.create(
        model="Qwen/Qwen2.5-72B-Instruct",
        max_tokens=1500,
        messages=[
            {"role": "system", "content": EVAL_SYSTEM},
            {"role": "user", "content": prompt},
        ]
    )

    text = response.choices[0].message.content.replace("```json", "").replace("```", "").strip()
    match = re.search(r'\{[\s\S]*\}', text)
    data  = __import__('json').loads(match.group()) if match else {}

    scores = data.get("scores", {})
    weights = {
        "knowledge_depth":     0.30,
        "communication":       0.25,
        "framework_adherence": 0.20,
        "confidence_signals":  0.15,
        "completeness":        0.10,
    }
    overall = sum(scores.get(k, 5) * w for k, w in weights.items())

    return AnswerScore(
        knowledge_depth     = scores.get("knowledge_depth",     5),
        communication       = scores.get("communication",       5),
        framework_adherence = scores.get("framework_adherence", 5),
        confidence_signals  = scores.get("confidence_signals",  5),
        completeness        = scores.get("completeness",        5),
        overall             = round(overall, 1),
        feedback            = data.get("feedback",          ""),
        strengths           = data.get("strengths",         []),
        weaknesses          = data.get("weaknesses",        []),
        missing_points      = data.get("missing_points",    []),
        filler_detected     = fillers_found,
        vague_phrases       = [v for v in VAGUE_PHRASES if v in answer.lower()],
        improved_answer     = data.get("improved_answer",   ""),
        follow_up_triggered = data.get("follow_up_triggered", False),
        follow_up_question  = data.get("follow_up_question", None),
    )


def json_list(items: List[str]) -> str:
    return "\n".join(f"  - {item}" for item in items)


def score_communication_only(transcript: str) -> Dict:
    """
    Lightweight communication analysis without full eval.
    Used for speech coaching feedback.
    """
    fillers = detect_fillers(transcript)
    words   = transcript.split()
    wpm_estimate = len(words)  # caller divides by duration_seconds / 60

    sentences  = re.split(r'[.!?]+', transcript)
    avg_sentence_len = sum(len(s.split()) for s in sentences) / max(len(sentences), 1)

    # Passive voice indicators
    passive_indicators = ["was done", "was built", "was implemented", "was created",
                          "has been", "had been", "were done", "were built"]
    passive_count = sum(1 for p in passive_indicators if p in transcript.lower())

    return {
        "filler_words":       fillers,
        "filler_count":       len(fillers),
        "word_count":         len(words),
        "estimated_wpm_base": wpm_estimate,
        "avg_sentence_length": round(avg_sentence_len, 1),
        "passive_voice_count": passive_count,
        "communication_score": max(0, 10 - len(fillers) * 0.5 - passive_count * 0.3),
        "coaching_tips": _communication_tips(fillers, avg_sentence_len, passive_count),
    }


def _communication_tips(fillers, avg_len, passive_count) -> List[str]:
    tips = []
    if len(fillers) > 3:
        tips.append(f"Reduce filler words: detected '{fillers[0]}', '{fillers[1] if len(fillers)>1 else ''}'. Use a 1-second pause instead.")
    if avg_len > 25:
        tips.append("Sentences are too long. Break into shorter, punchier statements.")
    if passive_count > 2:
        tips.append("Use active voice. Say 'I built' not 'it was built'.")
    if not tips:
        tips.append("Communication is clear. Focus on adding more specific metrics.")
    return tips
