# backend/research_routes.py
"""
Research Agent v2 — FastAPI Routes
=====================================
Mount into main.py with:
    app.include_router(research_router, prefix="/api/research")

Endpoints:
  POST /company          → full company intelligence report
  POST /why-this-company → personalized "why this company" answers (interview + email hooks)
  POST /person           → research a specific person for personalized outreach
  POST /outreach-kit     → combined company + person → ready-to-use personalization kit
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

research_router = APIRouter(tags=["research_v2"])


# ── Request Models ─────────────────────────────────────────────────────────────

class CompanyResearchInput(BaseModel):
    company:  str
    role:     Optional[str] = ""

class WhyThisCompanyInput(BaseModel):
    company:  str
    role:     Optional[str] = ""
    jd:       Optional[str] = ""   # job description for extra specificity

class PersonIntelInput(BaseModel):
    person_name:   str
    company:       str
    person_title:  Optional[str] = ""
    linkedin_url:  Optional[str] = ""

class OutreachKitInput(BaseModel):
    company:       str
    person_name:   Optional[str] = ""
    person_title:  Optional[str] = ""
    role:          Optional[str] = ""
    outreach_mode: Optional[str] = "cold_email"  # cold_email/connection_request/founder/coffee_chat/etc


# ── Routes ─────────────────────────────────────────────────────────────────────

@research_router.post("/company")
def company_research(req: CompanyResearchInput):
    """
    Full company intelligence report.
    Funding, mission, products, tech stack, culture, interview process,
    Glassdoor signals, recent news, green/red flags.
    """
    from agents.research_agent import company_deep_dive
    return company_deep_dive(req.company, req.role)


@research_router.post("/why-this-company")
def why_this_company(req: WhyThisCompanyInput):
    """
    Generate a personalized answer to "Why do you want to work here?"

    Returns:
    - interview_answer: 2-3 para spoken answer for the interview room
    - email_hook: 1-2 sentence opener for cold emails
    - linkedin_note_hook: 1-sentence opener for connection notes

    Finds SPECIFIC overlaps between candidate's actual work and company's actual work.
    No generic "I love your culture" answers.
    """
    from agents.research_agent import why_this_company as _why
    return _why(req.company, req.role, req.jd)


@research_router.post("/person")
def person_intel(req: PersonIntelInput):
    """
    Research a specific person (recruiter, hiring manager, founder).

    Returns:
    - Recent LinkedIn posts and articles
    - Career path and background
    - Shared interests with the candidate
    - Personalization hooks with example usage
    - What kind of messages they'd respond to
    """
    from agents.research_agent import person_intel as _person
    return _person(
        req.person_name,
        req.company,
        req.person_title,
        req.linkedin_url,
    )


@research_router.post("/outreach-kit")
def outreach_kit(req: OutreachKitInput):
    """
    Full personalization kit — combines company + person research.
    Directly feeds into the outreach agent.

    Returns:
    - 3 subject line options with reasoning
    - 3 opening hooks (specific, non-generic)
    - Company talking points with how to weave them in naturally
    - Person talking points with source and how to reference
    - Why-this-company + why-this-role one-liners
    - Fully assembled email template (personalized)
    - Personalized LinkedIn note (≤300 chars)
    - What to avoid for this specific person/company
    """
    from agents.research_agent import outreach_intel
    return outreach_intel(
        req.company,
        req.person_name,
        req.person_title,
        req.role,
        req.outreach_mode,
    )