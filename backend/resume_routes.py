# backend/resume_routes.py
"""
Resume Agent v2 — FastAPI Routes
==================================
Mount into main.py with:
    app.include_router(resume_router, prefix="/api/resume")

Endpoints:
  POST /optimize          → full pipeline (all 9 features, both A/B variants)
  POST /analyze           → stages 1+2 only (parse + analyze, no rewrite, fast)
  POST /parse             → stage 1 only (structure raw resume text)
  POST /analyze-jd        → analyze a job description standalone
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

resume_router = APIRouter(tags=["resume_v2"])


class OptimizeRequest(BaseModel):
    job_description: str
    custom_resume:   Optional[str] = None  # uses profile default if omitted

class AnalyzeRequest(BaseModel):
    job_description: str
    custom_resume:   Optional[str] = None

class ParseRequest(BaseModel):
    resume_text: str

class JDRequest(BaseModel):
    job_description: str


@resume_router.post("/optimize")
def optimize(req: OptimizeRequest):
    """
    Full integrated pipeline. All 9 features fire in sync.
    Returns:
    - Full analysis (ATS score, skill gaps, narrative gap, section scores, bullet weakness)
    - Variant A: conservative rewrite (preserves voice)
    - Variant B: aggressive rewrite (max ATS)
    - A/B comparison scores across 6 dimensions
    - Recommendation: which variant to use for ATS screening vs human review
    """
    from agents.resume_agent import run
    return run(req.job_description, req.custom_resume)


@resume_router.post("/analyze")
def analyze(req: AnalyzeRequest):
    """
    Stages 1+2 only (parse + analyze). No rewrite. Fast.
    Use this for a quick gap check before running full optimize.
    Returns ATS score, missing keywords, skill alignment, bullet weakness list.
    """
    from agents.resume_agent import analyze_only
    return analyze_only(req.job_description, req.custom_resume)


@resume_router.post("/parse")
def parse(req: ParseRequest):
    """
    Stage 1 only. Converts raw resume text into structured JSON sections.
    Useful for previewing how the agent reads your resume.
    """
    from agents.resume_agent import parse_resume
    return parse_resume(req.resume_text)


@resume_router.post("/analyze-jd")
def analyze_jd(req: JDRequest):
    """
    Standalone JD analysis. Extracts requirements, ATS keywords, role type,
    seniority, emphasis weights, and what story the role wants to hear.
    """
    from agents.resume_agent import analyze_jd as _analyze_jd
    return _analyze_jd(req.job_description)