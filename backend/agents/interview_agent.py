# backend/agents/interview_agent.py
import os
import json, re
from huggingface_hub import InferenceClient
from memory.store import get_profile, log_agent_run

client = InferenceClient(api_key=os.environ.get("HF_TOKEN"))

SYSTEM_PROMPT = """You are a senior technical interviewer and career coach.
You generate highly specific interview prep based on the actual job description
and the candidate's real projects and background.

Questions must be ones that WILL likely be asked — not generic.
Model answers must reference the candidate's actual work specifically.

Always respond in valid JSON."""

def run(company: str, role: str, job_description: str = "") -> dict:
    profile = get_profile()

    prompt = f"""
Prepare this candidate for their interview:

CANDIDATE: {profile['name']}
EDUCATION: {profile['education']}
SKILLS: {profile['skills']}
PROJECTS:
{profile['projects']}

COMPANY: {company}
ROLE: {role}
JOB DESCRIPTION: {job_description or 'Not provided — use company/role context'}

Generate comprehensive interview prep. Return JSON:
{{
  "company_specific_questions": [
    {{
      "question": "...",
      "category": "technical/behavioral/system_design",
      "difficulty": "easy/medium/hard",
      "why_theyll_ask": "reason this question is likely",
      "model_answer": "answer using candidate's actual projects and background"
    }}
  ],
  "coding_questions": [
    {{
      "topic": "topic name",
      "example_problem": "problem statement",
      "approach": "how to solve it",
      "complexity": "time/space complexity"
    }}
  ],
  "ml_questions": [
    {{
      "question": "...",
      "answer": "detailed technical answer"
    }}
  ],
  "system_design": {{
    "likely_problem": "design problem they might ask",
    "approach": "step by step solution",
    "talking_points": ["point1", "point2"]
  }},
  "behavioral_questions": [
    {{
      "question": "...",
      "star_answer": {{
        "situation": "from candidate's experience",
        "task": "what needed to be done",
        "action": "what candidate did",
        "result": "outcome with metrics if possible"
      }}
    }}
  ],
  "projects_deep_dive": [
    {{
      "project": "Dia Legal",
      "expected_questions": ["question1", "question2"],
      "key_answers": ["answer1", "answer2"],
      "known_weaknesses": ["weakness to acknowledge honestly"],
      "how_to_defend": "how to address weaknesses confidently"
    }}
  ],
  "questions_to_ask_them": ["smart question1", "smart question2", "smart question3"],
  "red_flags_to_avoid": ["mistake1", "mistake2"],
  "preparation_checklist": ["item1", "item2", "item3"]
}}"""

    response = client.chat.completions.create(
        model="Qwen/Qwen2.5-72B-Instruct",
        max_tokens=3000,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]
    )

    text = response.choices[0].message.content
    match = re.search(r'\{.*\}', text, re.DOTALL)
    result = json.loads(match.group()) if match else {"raw": text}

    log_agent_run("interview", {"company": company, "role": role}, text)
    return result
