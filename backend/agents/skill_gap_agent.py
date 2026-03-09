# backend/agents/skill_gap_agent.py
import os
import json, re
from huggingface_hub import InferenceClient
from memory.store import get_profile, log_agent_run
from typing import List

client = InferenceClient(api_key=os.environ.get("HF_TOKEN"))

SYSTEM_PROMPT = """You are a senior AI/ML career strategist.
You analyze a candidate's current skills against their target role requirements
and create a precise, actionable skill gap analysis and learning roadmap.

Be brutally honest. Don't pad the list with things they already know.
Focus on what will actually move the needle for getting hired.

Always respond in valid JSON."""

def run(target_role: str, job_description: str = "", career_goals: str = "",
        market_signals: str = "", additional_jds: list = None) -> dict:
    profile = get_profile()

    prompt = f"""
Analyze skill gaps for this candidate:

CANDIDATE PROFILE:
Name: {profile['name']}
Education: {profile['education']}
Current Skills: {profile['skills']}
Projects: {profile['projects']}

TARGET ROLE: {target_role}
JOB DESCRIPTION: {job_description or 'Not provided'}
CAREER GOALS: {career_goals or 'Not provided'}
MARKET SIGNALS: {market_signals or 'Not provided'}

Return JSON:
{{
  "skills_you_have": [
    {{"skill": "skill name", "level": "beginner/intermediate/advanced", "evidence": "which project shows this"}}
  ],
  "skills_you_lack": [
    {{
      "skill": "skill name",
      "importance": "critical/important/nice-to-have",
      "gap_size": "small/medium/large",
      "why_it_matters": "why this skill is needed for the role"
    }}
  ],
  "priority_order": ["skill to learn first", "skill to learn second"],
  "six_week_roadmap": [
    {{
      "week": "Week 1-2",
      "focus": "topic to study",
      "goal": "specific milestone",
      "resources": ["resource1", "resource2"],
      "daily_hours": 2
    }}
  ],
  "thirty_sixty_ninety": {{
    "30_days": {{"focus": "...", "milestone": "...", "deliverable": "..."}},
    "60_days": {{"focus": "...", "milestone": "...", "deliverable": "..."}},
    "90_days": {{"focus": "...", "milestone": "...", "deliverable": "..."}}
  }},
  "quick_wins": [
    {{
      "action": "something you can do in <1 day",
      "impact": "how it helps your application"
    }}
  ],
  "projects_to_build": [
    {{
      "project": "project name",
      "skills_it_demonstrates": ["skill1", "skill2"],
      "estimated_time": "X days",
      "difficulty": "easy/medium/hard"
    }}
  ],
  "interview_risks": [
    {{
      "topic": "topic you might get grilled on",
      "current_level": "honest assessment",
      "prep_strategy": "how to prepare"
    }}
  ],
  "resume_recommendations": [
    "specific resume change to target this role"
  ],
  "competitive_advantage": "what makes this candidate uniquely strong for this role",
  "honest_assessment": "blunt paragraph on chances and what needs to change",
  "overall_readiness": <integer 0-100>
}}"""

    response = client.chat.completions.create(
        model="Qwen/Qwen2.5-72B-Instruct",
        max_tokens=2500,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]
    )

    text = response.choices[0].message.content
    match = re.search(r'\{.*\}', text, re.DOTALL)
    result = json.loads(match.group()) if match else {"raw": text}

    log_agent_run("skill_gap", {"target_role": target_role}, text)
    return result


def multi_role_analysis(target_roles: List[str], job_descriptions: List[str] = None,
                        career_goals: str = "", market_signals: str = "") -> dict:
    """Analyze skill gaps across multiple target roles simultaneously."""
    profile = get_profile()
    jds = job_descriptions or []

    roles_section = "\n".join([
        f"Role {i+1}: {role}" + (f"\nJD: {jds[i][:300]}" if i < len(jds) else "")
        for i, role in enumerate(target_roles)
    ])

    prompt = f"""
Compare this candidate's fit across multiple target roles:

CANDIDATE:
Name: {profile['name']}
Education: {profile['education']}
Skills: {profile['skills']}
Projects: {profile['projects']}

TARGET ROLES TO COMPARE:
{roles_section}

CAREER GOALS: {career_goals or 'Not specified'}
MARKET SIGNALS: {market_signals or 'Not specified'}

Return JSON:
{{
  "role_comparison": [
    {{
      "role": "role name",
      "readiness_score": <0-100>,
      "fit_summary": "one sentence honest assessment",
      "biggest_gap": "the single most important missing skill",
      "biggest_strength": "what makes candidate strong for this role",
      "time_to_ready": "how long to get interview-ready",
      "competition_level": "low/medium/high/very high"
    }}
  ],
  "recommended_primary": "which role to pursue first and why",
  "recommended_backup": "which role as backup",
  "skills_that_transfer": ["skill useful across all roles"],
  "skills_unique_to_each": [
    {{"role": "role name", "unique_skills_needed": ["skill1", "skill2"]}}
  ],
  "unified_study_plan": [
    {{"week": "Week 1-2", "focus": "skills useful for ALL roles", "goal": "..."}}
  ],
  "strategic_advice": "paragraph on best career path given current skills"
}}"""

    response = client.chat.completions.create(
        model="Qwen/Qwen2.5-72B-Instruct",
        max_tokens=2500,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]
    )

    text = response.choices[0].message.content
    match = re.search(r'\{.*\}', text, re.DOTALL)
    result = json.loads(match.group()) if match else {"raw": text}

    log_agent_run("skill_gap_multi", {"roles": target_roles}, text)
    return result
