# backend/outreach_routes.py
"""
Outreach Agent v2 — FastAPI Routes
=====================================
Mount into main.py with:
    app.include_router(outreach_router, prefix="/api/outreach")

Endpoints:
  POST /connection-request   — LinkedIn connection note (300 chars)
  POST /hidden-job-enquiry   — Probe for hidden openings
  POST /post-application     — Follow up after applying
  POST /referral-ask         — Ask for internal referral
  POST /founder              — Reach out to founder
  POST /coffee-chat          — Request 20-min informational call
  POST /run                  — Generic mode-based entry (legacy)
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

outreach_router = APIRouter(tags=["outreach_v2"])


# ── Request Models ─────────────────────────────────────────────────────────────

class ConnectionRequestInput(BaseModel):
    company:       str
    contact_name:  str
    contact_title: Optional[str] = ""
    extra_context: Optional[str] = ""

class HiddenJobEnquiryInput(BaseModel):
    company:       str
    contact_name:  Optional[str] = ""
    contact_title: Optional[str] = ""
    role:          Optional[str] = ""
    extra_context: Optional[str] = ""

class PostApplicationInput(BaseModel):
    company:       str
    role:          str
    contact_name:  Optional[str] = ""
    contact_title: Optional[str] = ""
    applied_date:  Optional[str] = ""
    extra_context: Optional[str] = ""

class ReferralAskInput(BaseModel):
    company:       str
    role:          str
    contact_name:  str
    relationship:  Optional[str] = ""     # "college batchmate", "LinkedIn 2nd-degree", etc.
    contact_title: Optional[str] = ""
    extra_context: Optional[str] = ""

class FounderOutreachInput(BaseModel):
    company:          str
    founder_name:     str
    founder_title:    Optional[str] = "Co-founder/CEO"
    role:             Optional[str] = ""
    company_insight:  Optional[str] = ""  # specific insight / recent news about company
    extra_context:    Optional[str] = ""

class CoffeeChatInput(BaseModel):
    company:       str
    contact_name:  str
    contact_title: Optional[str] = ""
    topics:        Optional[str] = ""     # what you want to learn about
    extra_context: Optional[str] = ""

class GenericOutreachInput(BaseModel):
    company:       str
    role:          Optional[str] = ""
    contact_name:  Optional[str] = ""
    contact_title: Optional[str] = ""
    mode:          str = "post_application"


# ── Routes ─────────────────────────────────────────────────────────────────────

@outreach_router.post("/connection-request")
def connection_request_route(req: ConnectionRequestInput):
    from agents.outreach_agent import connection_request
    return connection_request(
        company       = req.company,
        contact_name  = req.contact_name,
        contact_title = req.contact_title,
        extra_context = req.extra_context,
    )


@outreach_router.post("/hidden-job-enquiry")
def hidden_job_route(req: HiddenJobEnquiryInput):
    from agents.outreach_agent import hidden_job_enquiry
    return hidden_job_enquiry(
        company       = req.company,
        contact_name  = req.contact_name,
        contact_title = req.contact_title,
        role          = req.role,
        extra_context = req.extra_context,
    )


@outreach_router.post("/post-application")
def post_application_route(req: PostApplicationInput):
    from agents.outreach_agent import post_application
    return post_application(
        company       = req.company,
        role          = req.role,
        contact_name  = req.contact_name,
        contact_title = req.contact_title,
        applied_date  = req.applied_date,
        extra_context = req.extra_context,
    )


@outreach_router.post("/referral-ask")
def referral_ask_route(req: ReferralAskInput):
    from agents.outreach_agent import referral_ask
    return referral_ask(
        company       = req.company,
        role          = req.role,
        contact_name  = req.contact_name,
        relationship  = req.relationship,
        contact_title = req.contact_title,
        extra_context = req.extra_context,
    )


@outreach_router.post("/founder")
def founder_outreach_route(req: FounderOutreachInput):
    from agents.outreach_agent import founder_outreach
    return founder_outreach(
        company         = req.company,
        founder_name    = req.founder_name,
        founder_title   = req.founder_title,
        role            = req.role,
        company_insight = req.company_insight,
        extra_context   = req.extra_context,
    )


@outreach_router.post("/coffee-chat")
def coffee_chat_route(req: CoffeeChatInput):
    from agents.outreach_agent import coffee_chat
    return coffee_chat(
        company       = req.company,
        contact_name  = req.contact_name,
        contact_title = req.contact_title,
        topics        = req.topics,
        extra_context = req.extra_context,
    )


@outreach_router.post("/run")
def generic_run(req: GenericOutreachInput):
    """Legacy endpoint — mode-based dispatch."""
    from agents.outreach_agent import run
    return run(req.company, req.role, req.contact_name, req.contact_title, req.mode)