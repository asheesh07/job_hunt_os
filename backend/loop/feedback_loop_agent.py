# backend/agents/feedback_loop_agent.py
"""
Agent 4 — Feedback Loop + Analytics
=======================================
The core of the self-improving system. Every outcome logged here triggers
updates to Profile Intelligence (Agent 1), which improves scoring (Agent 2)
and outreach calibration (Agent 3) on the next cycle.

This is what makes Job Hunt OS different from every other tool:
outcomes are not just tracked — they're fed back into strategy.

Exposes:
  log_outcome(application_id, outcome, notes) → triggers full learning cycle
  get_analytics() → conversion funnel, response rates, trend data
  get_strategy_report() → LLM-generated strategic analysis with recommendations
  get_weekly_summary() → what happened this week + what to change
"""

import os
import json
import re
from datetime import datetime, timedelta
from huggingface_hub import InferenceClient
from memory.store import (
    get_applications, update_application_status,
    save_application, log_agent_run, get_profile
)

client = InferenceClient(api_key=os.environ.get("HF_TOKEN"))

SYSTEM_PROMPT = """You are a job search strategist analyzing real application data.
You identify patterns, diagnose bottlenecks, and recommend specific strategic shifts.
Be direct and specific. No generic advice. Always respond with valid JSON."""

VALID_OUTCOMES = {
    "applied": "Applied",
    "responded": "Interview",
    "interview": "Interview",
    "offer": "Offer",
    "rejected": "Rejected",
    "ghosted": "Rejected",
    "bookmarked": "Bookmarked",
}


def log_outcome(application_id: str, outcome: str, notes: str = "") -> dict:
    """
    THE CORE METHOD. Log an outcome and trigger the full learning cycle.
    
    This is called whenever:
    - An application gets a response (positive or negative)
    - An interview is scheduled
    - An offer comes in
    - A follow-up goes unanswered (ghosted)
    
    It does three things:
    1. Updates application status in the store
    2. Triggers Agent 1 (Profile Intelligence) to update derived patterns
    3. If outreach outcome, triggers Agent 3 (Outreach Engine) to update patterns
    """
    outcome_lower = outcome.lower()
    status = VALID_OUTCOMES.get(outcome_lower, "Applied")

    # Update application status
    updated = update_application_status(application_id, status)
    if not updated:
        return {"error": f"Application {application_id} not found"}

    # Trigger Agent 1 pattern update
    from loop.profile_intelligence import update_from_outcome as profile_update
    intelligence_result = profile_update(
        application_id=application_id,
        outcome=outcome_lower,
        notes=notes,
    )

    log_agent_run(
        "feedback_loop",
        {"app_id": application_id, "outcome": outcome},
        json.dumps({"intelligence_updated": intelligence_result.get("updated", False)})
    )

    return {
        "outcome_logged": True,
        "application_id": application_id,
        "status_updated_to": status,
        "profile_intelligence_updated": intelligence_result.get("updated", False),
        "message": f"Outcome '{outcome}' logged. Pattern model {'updated' if intelligence_result.get('updated') else 'scheduled for next batch update'}.",
    }


def get_analytics() -> dict:
    """
    Conversion funnel + response rate analytics.
    The dashboard view: how is the job search actually performing?
    """
    applications = get_applications()
    if not applications:
        return {
            "total_applications": 0,
            "message": "No applications tracked yet. Add applications to see analytics.",
            "funnel": {},
            "loop_cycles": len([a for a in applications if a.get("status") != "Bookmarked"]),
            "response_rate_pct": 0,
        }

    funnel = {
        "Bookmarked": 0,
        "Applied": 0,
        "Interview": 0,
        "Offer": 0,
        "Rejected": 0,
    }
    by_company_type = {}
    by_week = {}
    recent_30_applied = 0
    recent_30_responded = 0

    cutoff_30 = datetime.now() - timedelta(days=30)

    for app in applications:
        status = app.get("status", "Bookmarked")
        funnel[status] = funnel.get(status, 0) + 1

        ctype = app.get("company_type", "unspecified")
        if ctype not in by_company_type:
            by_company_type[ctype] = {"applied": 0, "responded": 0, "conversion_pct": 0}
        by_company_type[ctype]["applied"] += 1
        if status in ("Interview", "Offer"):
            by_company_type[ctype]["responded"] += 1

        # Week bucketing
        created = app.get("created_at", "")
        try:
            dt = datetime.fromisoformat(created)
            week_key = dt.strftime("%Y-W%V")
            if week_key not in by_week:
                by_week[week_key] = {"applied": 0, "responded": 0}
            by_week[week_key]["applied"] += 1
            if status in ("Interview", "Offer"):
                by_week[week_key]["responded"] += 1

            if dt > cutoff_30:
                recent_30_applied += 1
                if status in ("Interview", "Offer"):
                    recent_30_responded += 1
        except (ValueError, TypeError):
            pass

    # Compute conversion rates
    for ctype, data in by_company_type.items():
        if data["applied"] > 0:
            data["conversion_pct"] = round(data["responded"] / data["applied"] * 100, 1)

    total_applied = funnel.get("Applied", 0) + funnel.get("Interview", 0) + funnel.get("Offer", 0) + funnel.get("Rejected", 0)
    total_responded = funnel.get("Interview", 0) + funnel.get("Offer", 0)
    overall_rate = round(total_responded / total_applied * 100, 1) if total_applied > 0 else 0
    recent_rate = round(recent_30_responded / recent_30_applied * 100, 1) if recent_30_applied > 0 else 0

    # Compute trend
    if recent_rate > overall_rate + 5:
        trend = "improving"
    elif recent_rate < overall_rate - 5:
        trend = "declining"
    else:
        trend = "flat"

    # Weekly data sorted
    weeks_sorted = sorted(by_week.items())
    weekly_series = [
        {"week": w, "applied": d["applied"], "responded": d["responded"],
         "rate": round(d["responded"] / d["applied"] * 100, 1) if d["applied"] > 0 else 0}
        for w, d in weeks_sorted
    ]

    # Bottleneck detection
    if total_applied == 0:
        bottleneck = "Not enough applications sent yet"
    elif overall_rate < 10:
        bottleneck = "Application stage — very few getting through ATS/screening"
    elif funnel.get("Interview", 0) > 0 and funnel.get("Offer", 0) == 0:
        bottleneck = "Interview stage — getting callbacks but not converting interviews"
    else:
        bottleneck = "Volume — response rate is acceptable but need more applications"

    return {
        "total_applications": len(applications),
        "funnel": funnel,
        "overall_response_rate_pct": overall_rate,
        "recent_30_day_rate_pct": recent_rate,
        "trend": trend,
        "bottleneck": bottleneck,
        "by_company_type": by_company_type,
        "weekly_series": weekly_series,
        "best_company_type": max(by_company_type.items(), key=lambda x: x[1]["conversion_pct"], default=(None, {}))[0],
    }


def get_strategy_report() -> dict:
    """
    LLM-generated strategic analysis. The "what should I do differently?" answer.
    Reads real data and gives a concrete strategic recommendation.
    """
    analytics = get_analytics()
    profile = get_profile()
    intel = profile.get("derived_intelligence", {})

    if analytics.get("total_applications", 0) < 5:
        return {
            "sufficient_data": False,
            "message": "Need at least 5 applications to generate a strategy report.",
            "action": "Apply to more roles and log outcomes to build the pattern dataset.",
        }

    prompt = f"""
Analyze this job search data and generate a specific strategic recommendation.

ANALYTICS:
{json.dumps(analytics, indent=2)}

DERIVED INTELLIGENCE FROM PAST PATTERNS:
{json.dumps(intel, indent=2)}

CANDIDATE PROFILE:
Name: {profile.get('name')}
Target roles: {profile.get('target_roles', [])}
Target companies: {profile.get('target_companies', [])}

Generate a strategic report. Be specific — reference actual numbers from the data.
No generic advice.

Return JSON:
{{
  "diagnosis": "what the data says about the current job search performance",
  "bottleneck": "the single biggest issue killing conversion right now",
  "what_is_working": ["specific thing backed by data"],
  "what_is_not": ["specific thing backed by data"],
  "strategic_shift": "the single most important thing to change NOW",
  "tactical_changes": [
    {{
      "change": "specific tactical change",
      "expected_impact": "what should improve and by how much",
      "how_to_implement": "concrete next step"
    }}
  ],
  "company_type_recommendation": "which company type to focus on and why",
  "outreach_recommendation": "what to change about outreach based on response data",
  "projected_rate": "if strategic shift is implemented, expected response rate",
  "timeline": "how long before changes show up in the data"
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
    result = json.loads(match.group()) if match else {"raw": text}
    log_agent_run("feedback_strategy", {}, text)
    return {"sufficient_data": True, **result}


def get_weekly_summary() -> dict:
    """
    What happened this week in the job search. Concrete delta report.
    """
    analytics = get_analytics()
    applications = get_applications()

    week_ago = datetime.now() - timedelta(days=7)
    this_week = [
        a for a in applications
        if _parse_dt(a.get("created_at", "")) > week_ago
        or _parse_dt(a.get("updated_at", "")) > week_ago
    ]

    new_this_week = [a for a in this_week if _parse_dt(a.get("created_at", "")) > week_ago]
    outcomes_this_week = [
        a for a in this_week
        if a.get("status") in ("Interview", "Offer", "Rejected")
        and _parse_dt(a.get("updated_at", "")) > week_ago
    ]

    return {
        "week_ending": datetime.now().strftime("%Y-%m-%d"),
        "new_applications": len(new_this_week),
        "outcomes_received": len(outcomes_this_week),
        "outcomes_breakdown": {
            "interviews": sum(1 for a in outcomes_this_week if a.get("status") == "Interview"),
            "offers": sum(1 for a in outcomes_this_week if a.get("status") == "Offer"),
            "rejections": sum(1 for a in outcomes_this_week if a.get("status") == "Rejected"),
        },
        "overall_pipeline": analytics.get("funnel", {}),
        "current_response_rate": analytics.get("overall_response_rate_pct", 0),
        "trend": analytics.get("trend", "unknown"),
        "bottleneck": analytics.get("bottleneck", "unknown"),
    }


def _parse_dt(s: str):
    try:
        return datetime.fromisoformat(s)
    except (ValueError, TypeError):
        return datetime.min