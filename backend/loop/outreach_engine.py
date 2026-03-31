# backend/agents/outreach_engine.py
"""
Agent 3 — Outreach Engine
============================
Generates personalized outreach AND tracks which messages got responses.
Uses SQLite (memory/outreach_store.py) — not JSON files.

Every generated message is logged to the outreach table.
Every recorded response updates the pattern model via profile_intelligence.

Delegates raw message generation to the existing outreach_agent.py utility.
The intelligence calibration and outcome tracking is what's new here.
"""

import os
import json
import re
import uuid
from datetime import datetime
from huggingface_hub import InferenceClient
from memory.store import log_agent_run
from memory.outreach_store import (
    save_outreach, record_response as db_record_response,
    get_winning_hooks, get_bombed_hooks,
    get_response_rate_by_mode, get_stats, get_outreach_by_id,
)

client = InferenceClient(api_key=os.environ.get("HF_TOKEN"))

SYSTEM_PROMPT = """You are an outreach strategist who generates messages calibrated
to what has actually worked for this specific candidate historically.
You never use generic templates. Every message reflects real pattern data.
Always respond with valid JSON only."""


def generate(
    company: str,
    role: str,
    contact_name: str = "",
    contact_title: str = "",
    mode: str = "cold_email",
    extra_context: str = "",
) -> dict:
    """
    Generate outreach message calibrated to winning historical patterns.
    Logs the generated message to SQLite for outcome tracking.
    Returns outreach_id to use when recording the response.
    """
    from loop.profile_intelligence import summarize_patterns
    from agents.outreach_agent import run as legacy_run

    pattern_summary = summarize_patterns()
    winning = get_winning_patterns()

    base_result = legacy_run(company, role, contact_name, contact_title, mode)

    winning_hooks = winning.get("winning_hooks", [])
    winning_angles = winning.get("winning_angles", [])
    avoided_phrases = winning.get("phrases_that_bombed", [])

    patterns_applied = []
    if winning.get("sufficient_data") and (winning_hooks or winning_angles):
        prompt = f"""
The candidate has real response data. Refine this outreach message to match
the winning patterns. Keep the same length and channel constraints.

{pattern_summary}

WINNING HOOKS (from messages that got positive responses):
{json.dumps(winning_hooks[:3], indent=2)}

WINNING ANGLES:
{json.dumps(winning_angles[:3], indent=2)}

PHRASES THAT GOT NO RESPONSE:
{json.dumps(avoided_phrases[:5], indent=2)}

BASE MESSAGE TO REFINE:
{json.dumps(base_result.get("channel_variants", {}), indent=2)}

Refine the email and LinkedIn note bodies to apply the winning patterns.
Return JSON:
{{
  "channel_variants": {{
    "email": {{"subject": "...", "body": "...", "word_count": <int>}},
    "linkedin_note": {{"char_count": <int>, "text": "..."}},
    "linkedin_inmail": {{"subject": "...", "body": "...", "word_count": <int>}}
  }},
  "patterns_applied": ["pattern 1 you used", "pattern 2"]
}}"""

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
        if match:
            try:
                calibrated = json.loads(match.group())
                base_result["channel_variants"] = calibrated.get(
                    "channel_variants", base_result.get("channel_variants", {})
                )
                patterns_applied = calibrated.get("patterns_applied", [])
            except json.JSONDecodeError:
                pass

    outreach_id = str(uuid.uuid4())[:8]
    email_data = base_result.get("channel_variants", {}).get("email", {})

    save_outreach({
        "id": outreach_id,
        "company": company,
        "role": role,
        "contact": contact_name,
        "mode": mode,
        "email_subject": email_data.get("subject", ""),
        "opening_hook": _first_sentence(email_data.get("body", "")),
        "patterns_used": patterns_applied,
        "sent_at": datetime.now().isoformat(),
    })

    base_result["outreach_id"] = outreach_id
    base_result["patterns_applied"] = patterns_applied
    base_result["calibrated"] = bool(patterns_applied)

    log_agent_run(
        "outreach_engine",
        {"company": company, "mode": mode, "id": outreach_id},
        json.dumps({"patterns": patterns_applied}),
    )
    return base_result


def record_response(outreach_id: str, response_type: str, notes: str = "") -> dict:
    """
    Record the outcome of a sent outreach message.
    Updates SQLite. Triggers profile intelligence pattern update.
    response_type: "positive" | "negative" | "no_response" | "bounced"
    """
    result = db_record_response(outreach_id, response_type, notes)
    if result.get("error"):
        return result

    entry = get_outreach_by_id(outreach_id)

    from loop.profile_intelligence import update_from_outcome
    update_from_outcome(
        application_id=outreach_id,
        outcome="responded" if response_type == "positive" else "rejected",
        notes=f"Outreach to {entry.get('company', '?')} via {entry.get('mode', '?')}. {notes}",
    )

    return {
        **result,
        "company": entry.get("company") if entry else None,
        "pattern_model_updated": True,
    }


def get_winning_patterns() -> dict:
    """
    Query SQLite for patterns that correlate with positive responses.
    Used to calibrate every new message generated.
    """
    stats = get_stats()
    total = stats.get("total", 0)

    if total < 5:
        return {
            "sufficient_data": False,
            "message": f"Only {total} outreach messages logged. Need 5+ to detect patterns.",
            "winning_hooks": [],
            "winning_angles": [],
            "phrases_that_bombed": [],
        }

    by_mode = get_response_rate_by_mode()
    winning_hooks_rows = get_winning_hooks(limit=10)
    bombed_rows = get_bombed_hooks(limit=10)

    if not winning_hooks_rows:
        return {
            "sufficient_data": True,
            "response_rate_pct": stats.get("response_rate_pct", 0),
            "winning_hooks": [],
            "winning_angles": [],
            "phrases_that_bombed": [
                r.get("opening_hook", "") for r in bombed_rows if r.get("opening_hook")
            ],
            "by_mode": by_mode,
            "message": "No positive responses yet.",
        }

    prompt = f"""
Analyze these outreach messages. What made the RESPONDED ones work?
What did NO_RESPONSE ones have in common?

MESSAGES THAT GOT RESPONSES:
{json.dumps([{"subject": r.get("email_subject"), "hook": r.get("opening_hook"), "company": r.get("company"), "mode": r.get("mode")} for r in winning_hooks_rows], indent=2)}

MESSAGES WITH NO RESPONSE (sample):
{json.dumps([{"subject": r.get("email_subject"), "hook": r.get("opening_hook"), "mode": r.get("mode")} for r in bombed_rows], indent=2)}

RESPONSE RATE BY MODE:
{json.dumps(by_mode, indent=2)}

Return JSON:
{{
  "winning_hooks": ["opening sentence pattern that got responses"],
  "winning_subject_patterns": ["subject line structure that works"],
  "winning_angles": ["project or angle that resonated"],
  "phrases_that_bombed": ["phrase or structure to avoid"],
  "best_mode": "which outreach mode has highest response rate",
  "key_insight": "single most important finding"
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
    result = json.loads(match.group()) if match else {}

    return {
        "sufficient_data": True,
        "response_rate_pct": stats.get("response_rate_pct", 0),
        "total_sent": total,
        "total_responded": stats.get("responded", 0),
        "by_mode": by_mode,
        **result,
    }


def _first_sentence(text: str) -> str:
    if not text:
        return ""
    for punct in [". ", "! ", "? ", "\n"]:
        idx = text.find(punct)
        if 0 < idx < 200:
            return text[:idx + 1].strip()
    return text[:150].strip()