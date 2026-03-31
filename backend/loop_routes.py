# backend/loop_routes.py
"""
Loop Agent Routes — the 4 agents that form the closed feedback loop.

Mount into main.py:
    from loop_routes import loop_router
    app.include_router(loop_router, prefix="/api/loop")

Route map:

  AGENT 1 — Profile Intelligence
    GET  /profile/enriched      → full profile + derived intelligence
    GET  /profile/patterns      → plain-text pattern summary

  AGENT 2 — Opportunity Scoring
    POST /score/single          → score one job
    POST /score/rank            → rank a list of jobs

  AGENT 3 — Outreach Engine
    POST /outreach/generate         → generate + log calibrated message
    POST /outreach/record-response  → record response → triggers learning
    GET  /outreach/patterns         → winning patterns from response history

  AGENT 4 — Feedback Loop + Analytics
    POST /outcome               → LOG AN OUTCOME (triggers full learning cycle)
    GET  /applications          → list all tracked applications (dashboard data)
    GET  /analytics             → conversion funnel, response rates, trends
    GET  /strategy              → LLM strategic analysis + recommendations
    GET  /weekly                → this week's delta summary
"""

from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

loop_router = APIRouter(tags=["loop_agents"])


# ── Request Models ─────────────────────────────────────────────────────────────

class OutcomeRequest(BaseModel):
    application_id: str
    outcome: str          # applied | responded | interview | offer | rejected | ghosted
    notes: Optional[str] = ""

class ScoreSingleRequest(BaseModel):
    job: Dict[str, Any]

class ScoreRankRequest(BaseModel):
    jobs: List[Dict[str, Any]]

class GenerateOutreachRequest(BaseModel):
    company: str
    role: str
    contact_name: Optional[str] = ""
    contact_title: Optional[str] = ""
    mode: str = "cold_email"
    extra_context: Optional[str] = ""

class RecordResponseRequest(BaseModel):
    outreach_id: str
    response_type: str    # positive | negative | no_response | bounced
    notes: Optional[str] = ""


# ── Agent 1: Profile Intelligence ─────────────────────────────────────────────

@loop_router.get("/profile/enriched")
def enriched_profile():
    """Full profile + all derived intelligence from outcome history."""
    from loop.profile_intelligence import get_enriched_profile
    return get_enriched_profile()


@loop_router.get("/profile/patterns")
def pattern_summary():
    """Plain-text pattern summary — what the system has learned about what works."""
    from loop.profile_intelligence import summarize_patterns
    return {"summary": summarize_patterns()}


# NOTE: /profile/update-from-outcome removed.
# POST /outcome (Agent 4) triggers profile intelligence update automatically.
# The frontend only needs one endpoint: log the outcome, everything else follows.


# ── Agent 2: Opportunity Scoring ──────────────────────────────────────────────

@loop_router.post("/score/single")
def score_single(req: ScoreSingleRequest):
    """
    Score one opportunity for callback probability.
    Calibrated to this candidate's actual application history.
    """
    from loop.opportunity_scorer import score_opportunity
    return score_opportunity(req.job)


@loop_router.post("/score/rank")
def score_rank(req: ScoreRankRequest):
    """
    Rank a list of opportunities by callback probability.
    Returns sorted list with scoring overlay on each job.
    """
    from loop.opportunity_scorer import rank_opportunities
    return rank_opportunities(req.jobs)


# ── Agent 3: Outreach Engine ──────────────────────────────────────────────────

@loop_router.post("/outreach/generate")
def generate_outreach(req: GenerateOutreachRequest):
    """
    Generate a calibrated outreach message and log it to SQLite.
    Returns outreach_id — pass this to /outreach/record-response when you hear back.
    """
    from loop.outreach_engine import generate
    return generate(
        company=req.company,
        role=req.role,
        contact_name=req.contact_name or "",
        contact_title=req.contact_title or "",
        mode=req.mode,
        extra_context=req.extra_context or "",
    )


@loop_router.post("/outreach/record-response")
def record_response(req: RecordResponseRequest):
    """
    Record the outcome of a sent outreach message.
    Updates SQLite. Triggers pattern learning in Agents 1 and 3.
    Call this every time an outreach gets a response (or confirmed no response).
    """
    from loop.outreach_engine import record_response as _record
    return _record(req.outreach_id, req.response_type, req.notes or "")


@loop_router.get("/outreach/patterns")
def outreach_patterns():
    """
    Winning patterns extracted from outreach history via SQL queries.
    Subject lines, hooks, and angles that have gotten positive responses.
    Requires 5+ logged messages to return meaningful patterns.
    """
    from loop.outreach_engine import get_winning_patterns
    return get_winning_patterns()


# ── Agent 4: Feedback Loop + Analytics ────────────────────────────────────────

@loop_router.post("/outcome")
def log_outcome(req: OutcomeRequest):
    """
    THE MOST IMPORTANT ENDPOINT. Single call does everything:
      1. Updates application status in the store
      2. Triggers Profile Intelligence to re-analyze all outcome history
      3. Updates derived_intelligence in profile.json (best company type,
         best outreach method, conversion bottleneck, what works, what doesn't)

    Call this whenever anything happens:
      - You sent an application           → outcome: "applied"
      - You got a response               → outcome: "responded"
      - You're scheduled for interview   → outcome: "interview"
      - You got an offer                 → outcome: "offer"
      - You got a rejection              → outcome: "rejected"
      - Nobody replied after a week      → outcome: "ghosted"

    The frontend calls ONLY this. Profile Intelligence updates are internal.
    """
    from loop.feedback_loop_agent import log_outcome as _log
    return _log(req.application_id, req.outcome, req.notes or "")


@loop_router.get("/applications")
def list_applications(
    status: Optional[str] = Query(None, description="Filter by status: Bookmarked|Applied|Interview|Offer|Rejected"),
    company_type: Optional[str] = Query(None, description="Filter by company_type"),
    limit: int = Query(100, ge=1, le=500),
):
    """
    List all tracked applications. Primary data source for the analytics dashboard.

    Optional filters:
      ?status=Interview         → only in-progress applications
      ?company_type=AI+startup  → only a specific company type
      ?limit=50                 → cap results

    Returns applications sorted newest first, with summary counts.
    """
    from memory.store import get_applications

    apps = get_applications()

    if status:
        apps = [a for a in apps if a.get("status", "").lower() == status.lower()]
    if company_type:
        apps = [a for a in apps if a.get("company_type", "").lower() == company_type.lower()]

    apps_sorted = sorted(
        apps,
        key=lambda a: a.get("created_at", ""),
        reverse=True,
    )[:limit]

    status_counts: Dict[str, int] = {}
    for a in apps:
        s = a.get("status", "Bookmarked")
        status_counts[s] = status_counts.get(s, 0) + 1

    total = len(apps)
    responded = status_counts.get("Interview", 0) + status_counts.get("Offer", 0)

    return {
        "applications": apps_sorted,
        "total": total,
        "returned": len(apps_sorted),
        "status_counts": status_counts,
        "response_rate_pct": round(responded / total * 100, 1) if total > 0 else 0,
        "filters_applied": {
            "status": status,
            "company_type": company_type,
            "limit": limit,
        },
    }


@loop_router.get("/analytics")
def analytics():
    """
    Full conversion funnel analytics.
    Response rates, trend (improving/flat/declining), bottleneck detection,
    by-company-type breakdown, weekly time series.
    """
    from loop.feedback_loop_agent import get_analytics
    return get_analytics()


@loop_router.get("/strategy")
def strategy_report():
    """
    LLM strategic analysis. Reads real outcome data, gives concrete recommendations.
    Requires 5+ logged applications — returns a "need more data" message otherwise.
    """
    from loop.feedback_loop_agent import get_strategy_report
    return get_strategy_report()


@loop_router.get("/weekly")
def weekly_summary():
    """
    This week's delta: new applications, outcomes received, pipeline state.
    """
    from loop.feedback_loop_agent import get_weekly_summary
    return get_weekly_summary()