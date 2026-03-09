# backend/skill_gap_routes.py
"""
Skill Gap Agent v2 — FastAPI Routes
Mount: app.include_router(skill_gap_router, prefix="/api/skill-gap")

Endpoints:
  POST /analyze         → single role, full 10-section report
  POST /multi-role      → multiple roles analyzed simultaneously
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List

skill_gap_router = APIRouter(tags=["skill_gap_v2"])


class SkillGapRequest(BaseModel):
    target_role:     str
    job_description: Optional[str] = ""
    career_goals:    Optional[str] = ""
    market_signals:  Optional[str] = ""
    additional_jds:  Optional[List[str]] = []

class MultiRoleRequest(BaseModel):
    target_roles:    List[str]
    job_descriptions: Optional[List[str]] = []
    career_goals:    Optional[str] = ""
    market_signals:  Optional[str] = ""


@skill_gap_router.post("/analyze")
def analyze(req: SkillGapRequest):
    """
    Full 6-step skill gap analysis against a single target role.
    Returns all 10 sections:
      1. Fit Score  2. Competitive Advantages  3. Critical Gaps
      4. Secondary Gaps  5. Structural Gaps  6. Market Demand
      7. 30-60-90 Day Plan  8. Resume Recommendations
      9. Interview Risks  10. Strategic Positioning
    """
    from agents.skill_gap_agent import run
    return run(
        target_role    = req.target_role,
        job_description = req.job_description,
        career_goals   = req.career_goals,
        market_signals = req.market_signals,
        additional_jds = req.additional_jds,
    )


@skill_gap_router.post("/multi-role")
def multi_role(req: MultiRoleRequest):
    """
    Analyze gaps against multiple target roles simultaneously.
    Useful for comparing readiness across role types
    (e.g. AI Researcher vs ML Engineer vs Research Engineer).
    """
    from agents.skill_gap_agent import multi_role_analysis
    return multi_role_analysis(
        target_roles     = req.target_roles,
        job_descriptions = req.job_descriptions,
        career_goals     = req.career_goals,
        market_signals   = req.market_signals,
    )