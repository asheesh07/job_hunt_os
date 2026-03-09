# backend/agents/interview_v2/question_bank.py
"""
Question Bank Engine
====================
Two modes:
  1. resume_to_qbank()  — parses resume, generates questions per project/skill
  2. jd_to_qbank()      — parses JD, generates role-specific question bank
  3. merged_qbank()     — combines both, deduplicates, prioritizes overlap

Each question has:
  - question text
  - category (project_deep_dive / skill_probe / behavioral / system_design /
               algorithm / stress_test / communication)
  - difficulty 1–5
  - expected_answer_framework (STAR / technical_explanation / tradeoff_analysis)
  - follow_up_probes  (list of harder follow-up questions)
  - evaluation_rubric (what a good answer covers)
  - stress_variants   (adversarial version of the same question)
"""

import os
import json
import re
from huggingface_hub import InferenceClient
from typing import List, Dict
from memory.store import get_profile, log_agent_run

client = InferenceClient(api_key=os.environ.get("HF_TOKEN"))


# ── Prompts ────────────────────────────────────────────────────────────────────

RESUME_QBANK_SYSTEM = """You are a senior technical interviewer at a top AI research lab.
Generate a comprehensive question bank from a candidate's resume.

Rules:
- Every project must have ≥3 deep-dive questions
- Every listed skill must have ≥1 probing question
- Include stress variants ("why not X?", "what's wrong with your approach?")
- Questions must be SPECIFIC to what's in the resume, not generic
- Difficulty must span 1-5 genuinely

Always respond with valid JSON only. No markdown, no preamble."""

JD_QBANK_SYSTEM = """You are a senior hiring manager preparing an interview for a specific role.
Generate a role-specific question bank from a job description.

Rules:
- Cover every key requirement mentioned in the JD
- Include both technical and behavioral questions
- System design questions must match the scale/domain of the role
- Include questions that expose weak candidates quickly
- Difficulty must span 1-5 genuinely

Always respond with valid JSON only. No markdown, no preamble."""

STRESS_SYSTEM = """You are a hostile senior engineer doing a stress-test interview.
Generate adversarial variants of questions that challenge the candidate's assumptions.

Rules:
- Challenge every design decision
- Ask "why not the obvious alternative?"
- Probe for edge cases the candidate didn't mention
- Expose overconfidence in claimed skills
- Be technically precise, not randomly harsh

Always respond with valid JSON only."""


def _parse_json(text: str) -> dict:
    text = text.replace("```json", "").replace("```", "").strip()
    match = re.search(r'\{[\s\S]*\}|\[[\s\S]*\]', text)
    if match:
        return json.loads(match.group())
    raise ValueError(f"No JSON found in response: {text[:200]}")


# ── Resume → Q Bank ────────────────────────────────────────────────────────────

def resume_to_qbank(custom_resume: str = None) -> Dict:
    """
    Parse candidate's resume and generate a full question bank.
    Returns structured dict with questions grouped by category.
    """
    profile = get_profile()
    resume  = custom_resume or profile["resume_text"]

    prompt = f"""
Candidate Resume:
Name: {profile['name']}
Education: {profile['education']}
Skills: {profile['skills']}
Projects: {profile['projects']}
Resume Summary: {resume}

Generate a comprehensive interview question bank. Return JSON:
{{
  "candidate_summary": "one line assessment of the candidate",
  "total_questions": <int>,
  "categories": {{
    "project_deep_dive": [
      {{
        "id": "q_001",
        "question": "...",
        "project": "project name this relates to",
        "difficulty": 1-5,
        "why_asked": "what weakness this exposes",
        "expected_answer_framework": "technical_explanation",
        "good_answer_covers": ["point1", "point2", "point3"],
        "follow_up_probes": [
          "deeper follow-up question 1",
          "deeper follow-up question 2"
        ],
        "stress_variant": "adversarial version of this question"
      }}
    ],
    "skill_probe": [
      {{
        "id": "q_020",
        "question": "...",
        "skill_being_tested": "skill name",
        "difficulty": 1-5,
        "why_asked": "...",
        "expected_answer_framework": "technical_explanation",
        "good_answer_covers": ["point1", "point2"],
        "follow_up_probes": ["follow-up 1"],
        "stress_variant": "..."
      }}
    ],
    "behavioral": [
      {{
        "id": "q_040",
        "question": "...",
        "competency": "what this tests (e.g. problem solving, ownership)",
        "difficulty": 1-5,
        "expected_answer_framework": "STAR",
        "good_answer_covers": ["S: ...", "T: ...", "A: ...", "R: ..."],
        "follow_up_probes": ["follow-up"],
        "stress_variant": "..."
      }}
    ],
    "system_design": [
      {{
        "id": "q_060",
        "question": "...",
        "difficulty": 1-5,
        "expected_answer_framework": "tradeoff_analysis",
        "good_answer_covers": ["requirement clarification", "scale estimation", "component design", "tradeoffs"],
        "follow_up_probes": ["follow-up"],
        "stress_variant": "..."
      }}
    ],
    "algorithm_ml": [
      {{
        "id": "q_080",
        "question": "...",
        "topic": "specific ML/algo topic",
        "difficulty": 1-5,
        "expected_answer_framework": "technical_explanation",
        "good_answer_covers": ["point1", "point2"],
        "follow_up_probes": ["follow-up"],
        "stress_variant": "..."
      }}
    ]
  }}
}}

Generate at least 5 questions per category. Make them SPECIFIC to this candidate's actual work.
"""

    response = client.chat.completions.create(
        model="Qwen/Qwen2.5-72B-Instruct",
        max_tokens=4000,
        messages=[
            {"role": "system", "content": RESUME_QBANK_SYSTEM},
            {"role": "user", "content": prompt},
        ]
    )
    text = response.choices[0].message.content
    result = _parse_json(text)
    log_agent_run("interview_qbank_resume", {"source": "resume"}, text)
    return result


# ── JD → Q Bank ───────────────────────────────────────────────────────────────

def jd_to_qbank(job_description: str, company: str = "", role: str = "") -> Dict:
    """
    Parse a job description and generate role-specific question bank.
    """
    profile = get_profile()

    prompt = f"""
Job Description:
Company: {company or "Unknown"}
Role: {role or "Unknown"}
JD Text: {job_description}

Candidate applying: {profile['name']}
Candidate skills: {profile['skills']}
Candidate projects: {profile['projects']}

Generate a role-specific question bank targeting THIS JD. Return JSON:
{{
  "role_analysis": {{
    "key_requirements": ["requirement1", "requirement2"],
    "likely_tech_stack": ["tech1", "tech2"],
    "red_flags_to_screen": ["what disqualifies a candidate"],
    "ideal_candidate_profile": "one paragraph"
  }},
  "questions": [
    {{
      "id": "jd_001",
      "question": "...",
      "category": "technical/behavioral/system_design/culture_fit",
      "jd_requirement_tested": "which JD line this covers",
      "difficulty": 1-5,
      "expected_answer_framework": "STAR/technical_explanation/tradeoff_analysis",
      "good_answer_covers": ["point1", "point2", "point3"],
      "candidate_match": "how candidate's background relates to this question",
      "follow_up_probes": ["follow-up 1", "follow-up 2"],
      "stress_variant": "adversarial version"
    }}
  ],
  "must_ask_questions": ["id1", "id2", "id3"],
  "quick_screen_questions": [
    {{
      "question": "...",
      "deal_breaker": "what wrong answer means instant reject"
    }}
  ]
}}

Generate at least 20 questions. Cover ALL key JD requirements.
"""

    response = client.chat.completions.create(
        model="Qwen/Qwen2.5-72B-Instruct",
        max_tokens=4000,
        messages=[
            {"role": "system", "content": JD_QBANK_SYSTEM},
            {"role": "user", "content": prompt},
        ]
    )
    text = response.choices[0].message.content
    result = _parse_json(text)
    log_agent_run("interview_qbank_jd", {"company": company, "role": role}, text)
    return result


# ── Stress Test Variants ───────────────────────────────────────────────────────

def generate_stress_questions(topic: str, candidate_answer: str = "") -> Dict:
    """
    Generate stress-test / adversarial questions on a specific topic or answer.
    Used by the pressure simulation engine.
    """
    profile = get_profile()

    prompt = f"""
Candidate: {profile['name']}
Projects: {profile['projects']}
Topic / previous answer: {topic}
{f"Candidate said: {candidate_answer}" if candidate_answer else ""}

Generate adversarial follow-up questions. Return JSON:
{{
  "stress_questions": [
    {{
      "id": "stress_001",
      "question": "...",
      "attack_angle": "what assumption this challenges",
      "expected_trap": "what weak candidates say",
      "strong_response_hint": "what a great answer addresses"
    }}
  ],
  "why_not_alternatives": [
    {{
      "question": "Why did you use X instead of Y?",
      "x": "what candidate used",
      "y": "the obvious alternative",
      "what_good_answer_covers": "tradeoffs, context, constraints"
    }}
  ],
  "curveball_questions": [
    {{
      "question": "...",
      "intent": "what this is actually testing"
    }}
  ]
}}
"""

    response = client.chat.completions.create(
        model="Qwen/Qwen2.5-72B-Instruct",
        max_tokens=2000,
        messages=[
            {"role": "system", "content": STRESS_SYSTEM},
            {"role": "user", "content": prompt},
        ]
    )
    return _parse_json(response.choices[0].message.content)


# ── Merged Q Bank ─────────────────────────────────────────────────────────────

def merged_qbank(job_description: str, company: str = "", role: str = "") -> Dict:
    """
    Generate both resume-based AND JD-based question banks,
    then merge them with priority on overlapping areas.
    """
    resume_bank = resume_to_qbank()
    jd_bank     = jd_to_qbank(job_description, company, role)

    # Find skill overlaps (candidate skills ∩ JD requirements)
    profile        = get_profile()
    candidate_skills = set(s.strip().lower() for s in profile.get("skills", "").split(","))
    jd_requirements  = set(r.lower() for r in jd_bank.get("role_analysis", {}).get("key_requirements", []))
    overlap = candidate_skills & jd_requirements

    return {
        "resume_bank":  resume_bank,
        "jd_bank":      jd_bank,
        "skill_overlap": list(overlap),
        "priority_topics": list(overlap)[:5],
        "merged_summary": {
            "total_resume_questions": resume_bank.get("total_questions", 0),
            "total_jd_questions":     len(jd_bank.get("questions", [])),
            "company":  company,
            "role":     role,
        }
    }
