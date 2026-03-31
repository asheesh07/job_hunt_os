# backend/agents/opportunity_scorer.py
"""
Agent 2 — Opportunity Scoring
================================
Takes raw job listings + enriched profile (with outcome history) and scores
each opportunity for PROBABILITY OF CALLBACK — not keyword match, not prestige.

The key difference from the old job_scout_agent:
  - Old: scores based on skill match alone (static)
  - New: scores based on skill match + what company types/roles have ACTUALLY
         responded to this specific candidate historically

Exposes:
  score_opportunity(job: dict) → scored job with callback_probability, priority, reasoning
  rank_opportunities(jobs: list) → sorted list, highest callback probability first
  explain_score(job_id: str) → detailed breakdown of why a job scored how it did
"""

import os
import json
import re
from huggingface_hub import InferenceClient
from memory.store import get_applications, log_agent_run
from loop.profile_intelligence import get_enriched_profile, summarize_patterns

client = InferenceClient(api_key=os.environ.get("HF_TOKEN"))

SYSTEM_PROMPT = """You are a job opportunity analyst. Your job is NOT to rank by prestige.
Your job is to predict which specific opportunities will result in a callback for THIS candidate,
given their real application history. Prioritize probability over attractiveness.

Think like a hiring strategist: smaller company + strong fit > big brand + weak fit.
Always respond with valid JSON only."""


def score_opportunity(job: dict) -> dict:
    """Score a single job opportunity for callback probability."""
    profile = get_enriched_profile()
    pattern_summary = summarize_patterns()

    prompt = f"""
Score this job opportunity for callback probability.

{pattern_summary}

CANDIDATE PROFILE:
Skills: {profile.get('skills', '')}
Projects: {profile.get('projects', '')}
Education: {profile.get('education', '')}
Resume: {profile.get('resume_text', '')[:400]}

JOB OPPORTUNITY:
{json.dumps(job, indent=2)}

Score this opportunity. Consider:
1. Skill match (objective overlap)
2. Pattern fit (does this match what's ACTUALLY worked for this candidate?)
3. Competition risk (how many strong candidates will apply?)
4. Company type fit (based on historical response rates)

Return JSON:
{{
  "job_id": "{job.get('id', 'unknown')}",
  "company": "{job.get('company', '')}",
  "role": "{job.get('role', '')}",
  "callback_probability": "Low/Medium/High",
  "callback_probability_pct": <integer 0-100>,
  "skill_match_score": <integer 0-100>,
  "pattern_fit_score": <integer 0-100>,
  "competition_risk": "Low/Medium/High",
  "composite_score": <integer 0-100>,
  "priority_group": "apply_now/apply_this_week/low_priority/skip",
  "why_high": ["specific reason this could work"],
  "why_low": ["specific risk or mismatch"],
  "recommended_action": "Direct Apply/Tailor Resume/Network First/Reach Hiring Manager",
  "action_reasoning": "one sentence specific to this candidate's history",
  "what_to_lead_with": "which project or skill to feature based on what has worked"
}}"""

    response = client.chat.completions.create(
        model="Qwen/Qwen2.5-72B-Instruct",
        max_tokens=800,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]
    )

    text = response.choices[0].message.content
    match = re.search(r'\{.*\}', text, re.DOTALL)
    result = json.loads(match.group()) if match else {"raw": text, "job_id": job.get("id")}
    log_agent_run("opportunity_scorer", {"job_id": job.get("id"), "company": job.get("company")}, text)
    return result


def rank_opportunities(jobs: list) -> list:
    """
    Score and rank a list of opportunities.
    Returns sorted list, highest callback_probability_pct first.
    Each item has original job data + scoring overlay.
    """
    profile = get_enriched_profile()
    pattern_summary = summarize_patterns()
    applications = get_applications()

    # Extract already-applied company names to deprioritize
    applied_companies = {a.get("company", "").lower() for a in applications}

    prompt = f"""
Rank these job opportunities for callback probability for this candidate.

{pattern_summary}

CANDIDATE PROFILE:
Skills: {profile.get('skills', '')}
Projects: {profile.get('projects', '')}
Education: {profile.get('education', '')}
Resume: {profile.get('resume_text', '')[:400]}

ALREADY APPLIED TO (deprioritize): {list(applied_companies)}

OPPORTUNITIES TO RANK:
{json.dumps(jobs, indent=2)}

For each opportunity, apply the scoring model. Use historical patterns to calibrate.
Return JSON:
{{
  "ranked": [
    {{
      "job_id": "...",
      "company": "...",
      "role": "...",
      "callback_probability_pct": <0-100>,
      "composite_score": <0-100>,
      "priority_group": "apply_now/apply_this_week/low_priority/skip",
      "pattern_fit": "high/medium/low",
      "competition_risk": "Low/Medium/High",
      "what_to_lead_with": "Dia Legal / EAAD / SentriX / skills",
      "recommended_action": "Direct Apply/Tailor Resume/Network First/Skip",
      "one_line_reason": "specific reason for this score given candidate history"
    }}
  ],
  "top_pick": "job_id of single best opportunity",
  "top_pick_reasoning": "why this one above all others",
  "apply_now_count": <int>,
  "skip_count": <int>
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
    result = json.loads(match.group()) if match else {"ranked": [], "raw": text}

    log_agent_run("opportunity_scorer_batch", {"job_count": len(jobs)}, text)

    # Merge scores back onto original job dicts
    score_map = {r["job_id"]: r for r in result.get("ranked", [])}
    enriched_jobs = []
    for job in jobs:
        score = score_map.get(job.get("id"), {})
        enriched_jobs.append({**job, "scoring": score})

    enriched_jobs.sort(
        key=lambda j: j.get("scoring", {}).get("composite_score", 0),
        reverse=True
    )

    return {
        "jobs": enriched_jobs,
        "top_pick": result.get("top_pick"),
        "top_pick_reasoning": result.get("top_pick_reasoning"),
        "apply_now_count": result.get("apply_now_count", 0),
        "summary": f"{result.get('apply_now_count', 0)} apply now, {result.get('skip_count', 0)} skip",
    }


def explain_score(job_id: str, jobs: list) -> dict:
    """Detailed breakdown of why a specific job scored how it did."""
    job = next((j for j in jobs if j.get("id") == job_id), None)
    if not job:
        return {"error": f"Job {job_id} not found"}

    profile = get_enriched_profile()
    intel = profile.get("derived_intelligence", {})
    pattern_summary = summarize_patterns()

    prompt = f"""
Give a detailed breakdown of why this job opportunity scored the way it did
for this specific candidate. Be direct and honest.

{pattern_summary}

JOB: {json.dumps(job, indent=2)}

CANDIDATE INTELLIGENCE:
{json.dumps(intel, indent=2)}

Return JSON:
{{
  "score_breakdown": {{
    "skill_match": {{"score": <0-100>, "matched": [], "missing": []}},
    "pattern_fit": {{"score": <0-100>, "explanation": "..."}},
    "competition": {{"level": "Low/Medium/High", "explanation": "..."}},
    "company_type_fit": {{"score": <0-100>, "explanation": "..."}}
  }},
  "honest_assessment": "blunt paragraph on real chances",
  "what_would_improve_odds": ["specific action 1", "action 2"],
  "comparable_wins": "description of similar opportunities that have worked historically"
}}"""

    response = client.chat.completions.create(
        model="Qwen/Qwen2.5-72B-Instruct",
        max_tokens=1000,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]
    )
    text = response.choices[0].message.content
    match = re.search(r'\{.*\}', text, re.DOTALL)
    return json.loads(match.group()) if match else {"raw": text}