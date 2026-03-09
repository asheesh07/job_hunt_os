# backend/agents/outreach_agent.py
"""
Outreach Agent v2
==================
Six purpose-built outreach modes, each with its own strategy, tone, and message structure.

Modes:
  1. connection_request    — LinkedIn connection note (300 char hard limit)
  2. hidden_job_enquiry    — Enquiring about openings when none are posted
  3. post_application      — Following up after submitting an application
  4. referral_ask          — Asking someone to refer you internally
  5. founder_outreach      — Reaching out directly to a founder/co-founder
  6. coffee_chat           — Requesting a 20-min informational call
"""

import os
import json
import re
from huggingface_hub import InferenceClient
from memory.store import get_profile, log_agent_run

client = InferenceClient(api_key=os.environ.get("HF_TOKEN"))

SYSTEM_PROMPT = """You are an elite career coach and copywriter who specializes in
outreach messages that actually get responses.

Your messages:
- Are specific to the person and company, never generic
- Lead with relevance or value, never desperation
- Respect the recipient's time (short, scannable)
- Sound like a real human wrote them, not an AI
- Match channel constraints (LinkedIn = short, email = slightly longer)
- Never beg, never oversell, never lie

Always respond with valid JSON only. No markdown fences."""

MODE_PROMPTS = {
    "connection_request": """
Mode: LinkedIn Connection Request Note
- HARD LIMIT: 300 characters
- Do NOT pitch anything — just open a door
- No "I saw your profile" or "I'd love to connect"
- Personalize with something specific about their work
- End with an easy open, no ask""",

    "hidden_job_enquiry": """
Mode: Enquiring About Jobs When None Are Posted
- Don't say "I couldn't find any openings"
- Lead with specific interest in their work/mission
- Mention most relevant project in one sentence
- Ask a specific question about the team first
- Slip in openness to opportunities — don't make it the focus
- Email: 100-130 words. LinkedIn: 80-100 words
- Subject: about THEM, not about you asking for a job""",

    "post_application": """
Mode: Following Up After Submitting an Application
- Confirm you applied (specific role + date)
- Add ONE piece of new info not in the application
- Express specific excitement about THIS company
- 3-4 sentences on LinkedIn, 5-6 in email
- Do NOT ask "did you receive my application?"
- Make it easy to respond or ignore""",

    "referral_ask": """
Mode: Asking Someone for an Internal Referral
- Acknowledge your relationship honestly
- Make it EASY — give them a one-liner they can paste
- Be specific about the role (title + link)
- Don't make them do research
- Offer reciprocity
- Give them a graceful out
- Generate: 1) warm version (close contact), 2) polite version (loose contact)""",

    "founder_outreach": """
Mode: Reaching Out Directly to a Founder
- First sentence must stop them cold
- Reference something specific: a talk, blog post, product decision
- Lead with insight or question, NOT your background
- Background comes second, in one line
- Under 100 words on LinkedIn, 120 on email
- Subject must not look like cold outreach""",

    "coffee_chat": """
Mode: Requesting a Coffee Chat (Informational Interview)
- Specific about WHY this person (their unique experience)
- Clear agenda (2-3 specific topics)
- Propose specific time or ask availability in one go
- "20 minutes" — not 30, not an hour
- Do NOT mention jobs — pure relationship building
- Easy out: "No worries if you're slammed" """
}

def _generate(mode, company, contact_name, contact_title, role, extra_context, profile):
    prompt = f"""
{MODE_PROMPTS.get(mode, "")}

---
CANDIDATE:
Name: {profile['name']}
Background: {profile['resume_text']}
Projects: {profile.get('projects', '')}
Skills: {profile.get('skills', '')}

TARGET:
Company: {company}
Contact: {contact_name or 'Unknown'} — {contact_title or 'Unknown title'}
Role: {role or 'Not specified'}
Extra context: {extra_context or 'None'}
---

Return JSON:
{{
  "mode": "{mode}",
  "channel_variants": {{
    "linkedin_note": {{
      "char_count": <int>,
      "text": "..."
    }},
    "linkedin_inmail": {{
      "subject": "...",
      "body": "...",
      "word_count": <int>
    }},
    "email": {{
      "subject": "...",
      "body": "...",
      "word_count": <int>
    }}
  }},
  "follow_up_sequence": [
    {{"day": 3, "channel": "linkedin", "trigger": "no response", "message": "..."}},
    {{"day": 7, "channel": "email", "trigger": "still no response", "message": "..."}},
    {{"day": 14, "channel": "linkedin", "trigger": "final attempt", "message": "graceful close"}}
  ],
  "personalization_hooks": [
    "what to research before sending",
    "what to look up on their LinkedIn",
    "what recent news or post to reference"
  ],
  "dos": ["specific do for this mode", "do 2", "do 3"],
  "donts": ["specific dont", "dont 2", "dont 3"],
  "send_timing": {{
    "best_day": "...",
    "best_time": "...",
    "reasoning": "..."
  }},
  "quality_score": <0-100>,
  "quality_notes": "what makes it strong or what to improve"
}}
"""
    response = client.chat.completions.create(
        model="Qwen/Qwen2.5-72B-Instruct",
        max_tokens=2000,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]
    )
    text = response.choices[0].message.content.replace("```json", "").replace("```", "").strip()
    match = re.search(r'\{[\s\S]*\}', text)
    result = json.loads(match.group()) if match else {"raw": text}
    log_agent_run("outreach", {"mode": mode, "company": company, "contact": contact_name}, text)
    return result


def connection_request(company, contact_name, contact_title="", extra_context=""):
    return _generate("connection_request", company, contact_name, contact_title, "", extra_context, get_profile())

def hidden_job_enquiry(company, contact_name="", contact_title="", role="", extra_context=""):
    return _generate("hidden_job_enquiry", company, contact_name, contact_title, role or "AI/ML role", extra_context, get_profile())

def post_application(company, role, contact_name="", contact_title="", applied_date="", extra_context=""):
    ctx = f"Applied on: {applied_date}. {extra_context}".strip()
    return _generate("post_application", company, contact_name, contact_title or "Recruiter", role, ctx, get_profile())

def referral_ask(company, role, contact_name, relationship="", contact_title="", extra_context=""):
    ctx = f"Relationship: {relationship}. {extra_context}".strip()
    return _generate("referral_ask", company, contact_name, contact_title, role, ctx, get_profile())

def founder_outreach(company, founder_name, founder_title="Co-founder/CEO", role="", company_insight="", extra_context=""):
    ctx = f"Company insight: {company_insight}. {extra_context}".strip()
    return _generate("founder_outreach", company, founder_name, founder_title, role, ctx, get_profile())

def coffee_chat(company, contact_name, contact_title="", topics="", extra_context=""):
    ctx = f"Topics to discuss: {topics}. {extra_context}".strip()
    return _generate("coffee_chat", company, contact_name, contact_title, "", ctx, get_profile())


def run(company, role, contact_name="", contact_title="", mode="post_application"):
    """Backwards-compatible entry point for orchestrator."""
    dispatch = {
        "connection_request": lambda: connection_request(company, contact_name, contact_title),
        "hidden_job_enquiry":  lambda: hidden_job_enquiry(company, contact_name, contact_title, role),
        "referral_ask":        lambda: referral_ask(company, role, contact_name, contact_title),
        "founder_outreach":    lambda: founder_outreach(company, contact_name, contact_title, role),
        "coffee_chat":         lambda: coffee_chat(company, contact_name, contact_title),
    }
    return dispatch.get(mode, lambda: post_application(company, role, contact_name, contact_title))()
