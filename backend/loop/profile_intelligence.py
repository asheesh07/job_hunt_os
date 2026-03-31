# backend/agents/profile_intelligence.py
"""
Agent 1 — Profile Intelligence
================================
Maintains a living model of who Asheesh is, what works for him, and what doesn't.
Reads outcome history from the store on every call to give other agents a
context-aware profile — not just raw skills, but patterns derived from real data.

Exposes:
  get_enriched_profile()  → profile + derived intelligence (used by all other agents)
  update_from_outcome()   → called by Agent 4 after every application outcome is logged
  summarize_patterns()    → generates a plain-text pattern summary for LLM context injection
"""

import os
import json
import re
from datetime import datetime
from huggingface_hub import InferenceClient
from memory.store import get_profile, save_profile, get_applications, get_agent_logs

client = InferenceClient(api_key=os.environ.get("HF_TOKEN"))

SYSTEM_PROMPT = """You are a career intelligence analyst. You read application outcome data
and derive actionable patterns: which company types respond, which outreach angles work,
which projects resonate, what the conversion bottlenecks are.

Output only valid JSON. Be specific. No generic advice."""


def get_enriched_profile() -> dict:
    """
    Return base profile + derived intelligence from outcome history.
    This is what every other agent should call instead of get_profile() directly.
    """
    profile = get_profile()
    applications = get_applications()
    intelligence = profile.get("derived_intelligence", {})

    enriched = {
        **profile,
        "derived_intelligence": intelligence,
        "application_count": len(applications),
        "outcome_summary": _compute_outcome_summary(applications),
    }
    return enriched


def _compute_outcome_summary(applications: list) -> dict:
    """Fast local computation — no LLM needed for raw counts."""
    if not applications:
        return {"total": 0, "message": "No applications tracked yet."}

    stages = {}
    by_company_type = {}
    by_outreach_method = {}

    for app in applications:
        status = app.get("status", "Bookmarked")
        stages[status] = stages.get(status, 0) + 1

        ctype = app.get("company_type", "unknown")
        if ctype not in by_company_type:
            by_company_type[ctype] = {"applied": 0, "responded": 0}
        by_company_type[ctype]["applied"] += 1
        if status in ("Interview", "Offer"):
            by_company_type[ctype]["responded"] += 1

        method = app.get("outreach_method", "unknown")
        if method not in by_outreach_method:
            by_outreach_method[method] = {"sent": 0, "responded": 0}
        by_outreach_method[method]["sent"] += 1
        if status in ("Interview", "Offer"):
            by_outreach_method[method]["responded"] += 1

    total = len(applications)
    responded = stages.get("Interview", 0) + stages.get("Offer", 0)
    response_rate = round((responded / total) * 100, 1) if total > 0 else 0

    return {
        "total": total,
        "by_stage": stages,
        "response_rate_pct": response_rate,
        "by_company_type": by_company_type,
        "by_outreach_method": by_outreach_method,
    }


def update_from_outcome(application_id: str, outcome: str, notes: str = "") -> dict:
    """
    Called by Agent 4 whenever an outcome is logged.
    Runs LLM analysis on full history to update derived_intelligence in profile.

    outcome: "responded" | "rejected" | "interview" | "offer" | "ghosted"
    """
    applications = get_applications()
    profile = get_profile()
    outcome_summary = _compute_outcome_summary(applications)

    # Only run expensive LLM update every 5 outcomes or on significant events
    significant = outcome in ("interview", "offer", "rejected")
    count = outcome_summary.get("total", 0)
    if not significant and count % 5 != 0:
        return {"updated": False, "reason": "Batching — will update at next milestone"}

    prompt = f"""
Analyze this candidate's application history and extract actionable patterns.

CANDIDATE PROFILE:
Name: {profile.get('name')}
Skills: {profile.get('skills', '')}
Projects: {profile.get('projects', '')}

OUTCOME HISTORY SUMMARY:
{json.dumps(outcome_summary, indent=2)}

MOST RECENT OUTCOME:
Application ID: {application_id}
Outcome: {outcome}
Notes: {notes or 'None'}

FULL APPLICATION LIST (last 20):
{json.dumps(applications[-20:], indent=2)}

Derive actionable intelligence from this data. Be specific and honest.
If there are fewer than 5 applications, note that patterns aren't statistically meaningful yet.

Return JSON:
{{
  "patterns_detected": [
    {{
      "pattern": "specific observation from the data",
      "confidence": "low/medium/high",
      "action": "what to do differently based on this"
    }}
  ],
  "what_works": ["specific thing that correlates with responses"],
  "what_doesnt": ["specific thing that correlates with silence"],
  "best_company_type": "which company type has highest response rate",
  "best_hook": "single best outreach opening line based on response data",
  "best_project": "which project to lead with for this candidate type",
  "best_outreach_method": "which outreach method has highest response rate",
  "conversion_bottleneck": "where in the funnel applications are dying",
  "recommended_priority_shift": "specific change to prioritization strategy",
  "response_rate_trend": "improving/flat/declining based on recent vs older applications",
  "data_quality": "how much to trust these patterns given sample size",
  "next_best_action": "single most impactful thing to do next"
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
    intelligence = json.loads(match.group()) if match else {"raw": text}
    intelligence["last_updated"] = datetime.now().isoformat()
    intelligence["based_on_n_applications"] = outcome_summary.get("total", 0)

    # Persist back into profile
    current = get_profile()
    current["derived_intelligence"] = intelligence
    save_profile(current)

    return {"updated": True, "intelligence": intelligence}


def summarize_patterns() -> str:
    """
    Returns a compact plain-text summary of derived intelligence.
    Injected into every other agent's prompt so they act on real data.
    """
    profile = get_profile()
    intel = profile.get("derived_intelligence", {})
    summary = profile.get("outcome_summary", {})

    if not intel or intel.get("based_on_n_applications", 0) < 3:
        return (
            "PATTERN INTELLIGENCE: Insufficient data yet — fewer than 3 applications tracked. "
            "Use profile defaults. Prioritize applying and logging outcomes to build pattern data."
        )

    lines = [
    f"PATTERN INTELLIGENCE (based on {intel.get('based_on_n_applications')} applications):",
    f"Response rate: {summary.get('response_rate_pct', '?')}%",
    f"Best company type: {intel.get('best_company_type', 'unknown')}",
    f"Best outreach method: {intel.get('best_outreach_method', 'unknown')}",
    f"Best hook: {intel.get('best_hook', 'unknown')}",        # ADD
    f"Best project: {intel.get('best_project', 'unknown')}",  # ADD
    f"Conversion bottleneck: {intel.get('conversion_bottleneck', 'unknown')}",
    f"Trend: {intel.get('response_rate_trend', 'unknown')}",
    f"Next best action: {intel.get('next_best_action', 'unknown')}",
]

    patterns = intel.get("patterns_detected", [])
    if patterns:
        lines.append("Key patterns:")
        for p in patterns[:3]:
            conf = p.get("confidence", "?")
            if conf in ("medium", "high"):
                lines.append(f"  - {p.get('pattern')} → {p.get('action')}")

    return "\n".join(lines)