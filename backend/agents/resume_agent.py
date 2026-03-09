# backend/agents/resume_agent.py
import os
import json, re
from huggingface_hub import InferenceClient
from memory.store import get_profile, log_agent_run

client = InferenceClient(api_key=os.environ.get("HF_TOKEN"))

SYSTEM_PROMPT = """You are an expert ATS resume optimizer and career coach.
You analyze job descriptions and resumes to:
1. Score ATS compatibility (0-100)
2. Identify missing keywords and skills
3. Rewrite bullets to be stronger and more aligned
4. Give specific, actionable improvements

Always respond in valid JSON. Be specific, not generic.
Focus on technical roles in AI/ML/Software Engineering."""


def run(job_description: str, custom_resume: str = None) -> dict:
    profile = get_profile()
    resume = custom_resume or profile["resume_text"]

    prompt = f"""
Analyze this resume against the job description.

JOB DESCRIPTION:
{job_description}

CANDIDATE RESUME:
{resume}

CANDIDATE BACKGROUND:
- Education: {profile['education']}
- Skills: {profile['skills']}
- Projects: {profile['projects']}

Return JSON with this exact structure:
{{
  "ats_score": <integer 0-100>,
  "match_percentage": <integer 0-100>,
  "found_keywords": ["keyword1", "keyword2"],
  "missing_keywords": ["keyword1", "keyword2"],
  "strong_points": ["point1", "point2", "point3"],
  "gaps": ["gap1", "gap2"],
  "rewritten_bullets": [
    {{"original": "old bullet", "improved": "new bullet with metrics and keywords"}}
  ],
  "skills_to_add": ["skill1", "skill2"],
  "summary_suggestion": "A 3-line professional summary tailored to this JD",
  "overall_recommendation": "short paragraph with honest assessment",
  "variant_a": {{
    "description": "Conservative rewrite — preserves your voice",
    "summary": "conservative summary suggestion",
    "rewritten_bullets": [{{"original": "...", "improved": "..."}}],
    "ats_score": <int>
  }},
  "variant_b": {{
    "description": "Aggressive rewrite — maximum ATS score",
    "summary": "aggressive summary with keywords",
    "rewritten_bullets": [{{"original": "...", "improved": "..."}}],
    "ats_score": <int>
  }},
  "recommendation": "which variant to use for ATS screening vs human review"
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

    log_agent_run("resume", {"jd_snippet": job_description[:200]}, text)
    return result


def analyze_only(job_description: str, custom_resume: str = None) -> dict:
    """Fast analysis (parse + analyze) without full rewrite."""
    profile = get_profile()
    resume = custom_resume or profile["resume_text"]

    prompt = f"""
Quick analysis — no rewrite needed. Just analyze gaps and score.

JOB DESCRIPTION:
{job_description}

CANDIDATE RESUME:
{resume}

Return JSON:
{{
  "ats_score": <integer 0-100>,
  "match_percentage": <integer 0-100>,
  "found_keywords": ["keyword1", "keyword2"],
  "missing_keywords": ["keyword1", "keyword2"],
  "skill_alignment": {{
    "strong_matches": ["skill present in both"],
    "partial_matches": ["skill present but needs more depth"],
    "missing_critical": ["skill required but absent"]
  }},
  "bullet_weaknesses": [
    {{"bullet": "weak bullet text", "issue": "what's wrong", "quick_fix": "how to improve without full rewrite"}}
  ],
  "section_scores": {{
    "summary": <0-10>,
    "experience": <0-10>,
    "skills": <0-10>,
    "projects": <0-10>,
    "education": <0-10>
  }},
  "overall_verdict": "pass/borderline/fail for ATS",
  "top_3_fixes": ["most impactful fix 1", "fix 2", "fix 3"]
}}"""

    response = client.chat.completions.create(
        model="Qwen/Qwen2.5-72B-Instruct",
        max_tokens=1500,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]
    )
    text = response.choices[0].message.content
    match = re.search(r'\{.*\}', text, re.DOTALL)
    result = json.loads(match.group()) if match else {"raw": text}
    log_agent_run("resume_analyze", {"jd_snippet": job_description[:200]}, text)
    return result


def parse_resume(resume_text: str) -> dict:
    """Parse raw resume text into structured JSON sections."""
    prompt = f"""
Parse this resume into structured sections. Extract exactly what's there — don't infer.

RESUME:
{resume_text}

Return JSON:
{{
  "name": "candidate name",
  "contact": {{"email": "...", "phone": "...", "location": "...", "linkedin": "...", "github": "..."}},
  "summary": "summary text if present",
  "education": [
    {{"degree": "...", "institution": "...", "year": "...", "gpa": "...", "coursework": []}}
  ],
  "experience": [
    {{"title": "...", "company": "...", "duration": "...", "bullets": ["bullet1", "bullet2"]}}
  ],
  "projects": [
    {{"name": "...", "description": "...", "tech_stack": [], "metrics": "...", "link": "..."}}
  ],
  "skills": {{
    "languages": [],
    "frameworks": [],
    "tools": [],
    "domains": []
  }},
  "publications": [],
  "certifications": [],
  "parse_quality": "how complete the parse was (good/partial/poor)",
  "parse_notes": "anything unusual or ambiguous found"
}}"""

    response = client.chat.completions.create(
        model="Qwen/Qwen2.5-72B-Instruct",
        max_tokens=2000,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]
    )
    text = response.choices[0].message.content
    match = re.search(r'\{.*\}', text, re.DOTALL)
    return json.loads(match.group()) if match else {"raw": text}


def analyze_jd(job_description: str) -> dict:
    """Standalone JD analysis — extract requirements, keywords, story."""
    prompt = f"""
Analyze this job description. Extract everything a candidate needs to know.

JOB DESCRIPTION:
{job_description}

Return JSON:
{{
  "role_type": "individual contributor / tech lead / research / management",
  "seniority": "junior/mid/senior/staff/principal",
  "team_context": "what team this person joins and their likely collaborators",
  "must_have_skills": ["non-negotiable skill 1", "skill 2"],
  "nice_to_have_skills": ["preferred but not required 1", "skill 2"],
  "ats_keywords": ["exact keyword to include in resume 1", "keyword 2"],
  "hidden_requirements": ["unstated but expected requirement 1", "requirement 2"],
  "red_flags": ["concerning signal 1 if any"],
  "key_responsibilities": ["main responsibility 1", "responsibility 2"],
  "emphasis_weights": {{
    "technical_skills": <0-10 how much they care>,
    "system_design": <0-10>,
    "ml_research": <0-10>,
    "communication": <0-10>,
    "leadership": <0-10>
  }},
  "story_they_want": "what career narrative fits this role best",
  "interview_likely_focus": ["likely interview topic 1", "topic 2"],
  "compensation_signals": "any comp signals in the JD",
  "culture_signals": "what culture signals can be inferred"
}}"""

    response = client.chat.completions.create(
        model="Qwen/Qwen2.5-72B-Instruct",
        max_tokens=1500,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]
    )
    text = response.choices[0].message.content
    match = re.search(r'\{.*\}', text, re.DOTALL)
    result = json.loads(match.group()) if match else {"raw": text}
    log_agent_run("resume_analyze_jd", {"jd_snippet": job_description[:200]}, text)
    return result
