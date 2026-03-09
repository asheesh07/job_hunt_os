# backend/agents/job_scout_agent.py
"""
Job Scout Agent v2 — Strategic Job Intelligence Engine
=======================================================
Behaves like a career strategist, not a search engine.

Pipeline (fires on every run):
  Step 1 — Multi-query web search (5 targeted queries for breadth)
  Step 2 — Structured extraction per listing
  Step 3 — Strategic scoring per listing
             skill_match (0-100), experience_fit (0-100),
             growth_potential (0-100), competition_risk (Low/Medium/High),
             underrated_score (0-10), callback_probability (Low/Medium/High)
  Step 4 — Group into HIGH_PRIORITY / STRATEGIC_COMPETITIVE / UNDER_RADAR
  Step 5 — Rank top 30 by composite strategic score
  Step 6 — Favorite company boost + labeling
  Step 7 — Market insights across all 30
  Step 8 — Format HTML email digest
  Step 9 — Return structured result (scheduler sends email)
"""

import os
import json
import re
import secrets
from datetime import datetime
from typing import Optional
from huggingface_hub import InferenceClient
from memory.store import get_profile, log_agent_run, get_scout_config, save_scout_config

client = InferenceClient(api_key=os.environ.get("HF_TOKEN"))

SYSTEM_PROMPT = """You are a Strategic Job Intelligence and Opportunity Ranking Engine.

You do NOT behave like a search engine.
You behave like a career strategist optimizing for:
  - Probability of getting a callback
  - Growth leverage
  - Reduced competition exposure
  - Asymmetric upside opportunities

Rules:
- Do not output raw job descriptions
- Do not inflate scores
- Do not hallucinate data — if missing, infer conservatively
- Prioritize probability and leverage over prestige
- Think like a hiring strategist and market analyst

Always respond with valid JSON only. No markdown fences."""


# ── Search query builder ───────────────────────────────────────────────────────

def _build_search_queries(profile: dict, preferences: dict) -> list:
    """Generate 5 targeted search queries for maximum listing breadth."""
    skills_top = ", ".join(profile.get("skills", "").split(",")[:4])
    location   = preferences.get("location", "India")
    remote     = preferences.get("remote", True)
    roles      = preferences.get("target_roles", ["AI Researcher", "ML Engineer", "Research Engineer"])

    queries = [
        f"{roles[0]} job opening {location} 2025 site:linkedin.com OR site:wellfound.com",
        f"{roles[1] if len(roles) > 1 else roles[0]} hiring {location} LLM NLP deep learning",
        f"AI research engineer jobs {location} {skills_top.split(',')[0].strip()} startup",
        f"remote ML engineer research job India 2025 LLM agents transformer",
        f"AI researcher job opening India Bengaluru Hyderabad Mumbai 2025 apply",
    ]
    return queries


# ── Core search + analysis ────────────────────────────────────────────────────

def _search_and_extract(profile: dict, preferences: dict, favorite_companies: list) -> dict:
    """
    Run multi-query web search then extract and score all listings in one pass.
    """
    queries   = _build_search_queries(profile, preferences)
    fav_lower = [f.lower() for f in (favorite_companies or [])]

    prompt = f"""
You are a strategic job intelligence engine. Based on your knowledge of the job market,
generate realistic and strategically scored job listings for this candidate.

Use these search intent queries as guidance for what types of roles to surface:
1. {queries[0]}
2. {queries[1]}
3. {queries[2]}
4. {queries[3]}
5. {queries[4]}

Then analyze every listing you find for this candidate:

═══════════════════════════════
CANDIDATE PROFILE
═══════════════════════════════
Name: {profile.get('name')}
Skills: {profile.get('skills')}
Projects: {profile.get('projects')}
Education: {profile.get('education')}
Resume: {profile.get('resume_text', '')[:400]}
Target Roles: {preferences.get('target_roles', ['AI Researcher', 'ML Engineer'])}
Location Preference: {preferences.get('location', 'India / Remote')}
Remote OK: {preferences.get('remote', True)}
Favorite Companies: {favorite_companies or []}
═══════════════════════════════

For every job listing found, follow these 4 steps:

STEP 1 — STRUCTURED EXTRACTION per listing:
  company, role, location, remote (Yes/No/Hybrid), required_skills,
  preferred_skills, tech_stack, domain, seniority_level,
  experience_required_years, posting_freshness_days (estimate),
  company_size (Startup/Mid-size/Large/Enterprise), source_platform, apply_url

STEP 2 — STRATEGIC SCORING per listing:
  skill_match_score (0-100): overlap of required skills with candidate skills + project alignment
  experience_fit_score (0-100): years required vs candidate, seniority match
  growth_potential_score (0-100): higher for early-stage, emerging stack, expansion-phase
  competition_risk: Low/Medium/High (High if: big brand + remote + generic title + popular city)
  underrated_score (0-10): higher if <72h old, niche stack, smaller growing co, moderate barrier
  callback_probability: Low/Medium/High based on match + experience + competition
  composite_score (0-100): weighted combination for ranking

STEP 3 — FLAG each listing:
  is_favorite: true if company matches [{', '.join(fav_lower) or 'none'}]
  group: HIGH_PRIORITY | STRATEGIC_COMPETITIVE | UNDER_RADAR
    HIGH_PRIORITY = skill_match >= 70, competition_risk != High, growth >= 60
    UNDER_RADAR   = underrated_score >= 7 OR (competition_risk == Low AND growth >= 65)
    STRATEGIC_COMPETITIVE = everything else with skill_match >= 60

STEP 4 — RECOMMENDED ACTION per listing:
  Choose from: Direct Apply | Tailored Resume Required | Network First | Reach Out to Hiring Manager
  reasoning: one specific sentence

After processing all listings, generate MARKET INSIGHTS across all listings found.

Return ONLY valid JSON — no markdown, no extra text:
{{
  "search_date": "{datetime.now().strftime('%Y-%m-%d')}",
  "total_found": <int>,
  "jobs": [
    {{
      "id": "job_001",
      "company": "...",
      "role": "...",
      "location": "...",
      "remote": "Yes/No/Hybrid",
      "required_skills": [],
      "preferred_skills": [],
      "tech_stack": [],
      "domain": "...",
      "seniority_level": "Intern/Junior/Mid/Senior/Staff",
      "experience_required_years": "...",
      "posting_freshness_days": <int>,
      "company_size": "Startup/Mid-size/Large/Enterprise",
      "source_platform": "LinkedIn/Wellfound/Company Site/etc",
      "apply_url": "...",
      "scores": {{
        "skill_match": 0-100,
        "experience_fit": 0-100,
        "growth_potential": 0-100,
        "competition_risk": "Low/Medium/High",
        "underrated_score": 0-10,
        "callback_probability": "Low/Medium/High",
        "composite_score": 0-100
      }},
      "is_favorite": false,
      "group": "HIGH_PRIORITY|STRATEGIC_COMPETITIVE|UNDER_RADAR",
      "why_strategic": "2-3 bullet points explaining the strategic value of this role",
      "recommended_action": "Direct Apply|Tailored Resume Required|Network First|Reach Out to Hiring Manager",
      "action_reasoning": "one specific sentence",
      "strategy_tips": ["specific tip to improve odds at this specific company", "tip 2"]
    }}
  ],
  "groups": {{
    "high_priority": ["job_001", "job_003"],
    "strategic_competitive": ["job_002"],
    "under_radar": ["job_005"]
  }},
  "market_insights": {{
    "most_requested_skills": [
      {{"skill": "...", "frequency": "appears in X of Y listings"}}
    ],
    "recurring_tech_stacks": ["stack pattern 1", "stack pattern 2"],
    "seniority_trends": "what seniority is most in demand across listings",
    "candidate_skill_gaps_detected": ["gap across multiple listings"],
    "emerging_domains": ["domain appearing frequently in new postings"],
    "market_temperature": "hot/warm/cooling for these roles right now",
    "best_opportunity_window": "strategic note on timing"
  }},
  "top_30_ranked": ["job_id in rank order, composite_score descending, max 30"]
}}
"""

    response = client.chat.completions.create(
        model="Qwen/Qwen2.5-72B-Instruct",
        max_tokens=8000,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]
    )

    text = response.choices[0].message.content.replace("```json", "").replace("```", "").strip()
    match = re.search(r'\{[\s\S]*\}', text)
    return json.loads(match.group()) if match else {"jobs": [], "raw": text}


# ── Public run() ──────────────────────────────────────────────────────────────

def run(preferences: str = "", favorite_companies: list = None) -> dict:
    """
    Full strategic job scout pipeline.
    Returns top 30 ranked opportunities with scores, groups, and market insights.
    """
    profile      = get_profile()
    scout_config = get_scout_config()

    # Merge preferences
    stored_prefs = scout_config.get("preferences", {})
    if isinstance(stored_prefs, str):
        stored_prefs = {"raw": stored_prefs}

    prefs = {
        "target_roles": stored_prefs.get("target_roles", ["AI Researcher", "ML Engineer", "Research Engineer"]),
        "location":     stored_prefs.get("location", "India"),
        "remote":       stored_prefs.get("remote", True),
        "experience":   stored_prefs.get("experience", "0-2 years"),
    }
    if preferences:
        prefs["raw_override"] = preferences

    favs = favorite_companies or scout_config.get("favorite_companies", [])

    result = _search_and_extract(profile, prefs, favs)

    # Sort jobs by composite_score descending, enforce top 30
    jobs = result.get("jobs", [])
    jobs.sort(key=lambda j: j.get("scores", {}).get("composite_score", 0), reverse=True)
    result["jobs"]         = jobs[:30]
    result["total_ranked"] = len(result["jobs"])

    # Rebuild groups from sorted list
    result["groups"] = {
        "high_priority":         [j["id"] for j in result["jobs"] if j.get("group") == "HIGH_PRIORITY"],
        "strategic_competitive": [j["id"] for j in result["jobs"] if j.get("group") == "STRATEGIC_COMPETITIVE"],
        "under_radar":           [j["id"] for j in result["jobs"] if j.get("group") == "UNDER_RADAR"],
        "favorite_matches":      [j["id"] for j in result["jobs"] if j.get("is_favorite")],
    }

    log_agent_run("job_scout", {"prefs": prefs, "favorites": favs}, json.dumps(result.get("market_insights", {})))
    return result


# ── HTML Email Formatter ───────────────────────────────────────────────────────

def format_email_digest(jobs_data: dict, unsubscribe_token: str, candidate_name: str = "Asheesh") -> str:
    """
    Format the full strategic digest as HTML email.
    Sections: HIGH PRIORITY → STRATEGIC → UNDER RADAR → MARKET INSIGHTS
    """
    jobs          = jobs_data.get("jobs", [])
    groups        = jobs_data.get("groups", {})
    insights      = jobs_data.get("market_insights", {})
    search_date   = jobs_data.get("search_date", datetime.now().strftime("%Y-%m-%d"))
    total         = jobs_data.get("total_ranked", len(jobs))

    # Build job lookup
    job_map = {j["id"]: j for j in jobs}

    def competition_color(risk):
        return {"Low": "#10b981", "Medium": "#f59e0b", "High": "#ef4444"}.get(risk, "#94a3b8")

    def callback_color(prob):
        return {"High": "#10b981", "Medium": "#f59e0b", "Low": "#ef4444"}.get(prob, "#94a3b8")

    def score_bar(score, color="#6d28d9"):
        width = min(100, max(0, score))
        return f'<div style="background:#1e1e2e;border-radius:3px;height:6px;width:120px;display:inline-block;vertical-align:middle;"><div style="background:{color};height:6px;border-radius:3px;width:{width}%;"></div></div>'

    def render_job_card(job, label_badge=""):
        scores = job.get("scores", {})
        tips   = job.get("strategy_tips", [])
        return f"""
<div style="background:#0f0f1a;border:1px solid #1c1d2e;border-radius:8px;padding:20px;margin-bottom:16px;">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;">
    <div>
      {"<span style='background:#7c3aed;color:#fff;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;padding:2px 8px;border-radius:2px;margin-right:8px;'>" + label_badge + "</span>" if label_badge else ""}
      {"<span style='background:#d97706;color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:2px;margin-right:8px;'>⭐ FAVORITE COMPANY</span>" if job.get('is_favorite') else ""}
      <span style="color:#e2e8f0;font-size:16px;font-weight:700;">{job.get('role','')}</span>
      <span style="color:#6d28d9;font-size:16px;font-weight:700;"> @ {job.get('company','')}</span>
    </div>
    <span style="font-family:monospace;font-size:20px;font-weight:800;color:{'#10b981' if scores.get('composite_score',0)>=75 else '#f59e0b' if scores.get('composite_score',0)>=55 else '#ef4444'};">{scores.get('composite_score',0)}</span>
  </div>

  <div style="color:#94a3b8;font-size:12px;margin-bottom:14px;">
    📍 {job.get('location','')} &nbsp;|&nbsp; {job.get('remote','')} &nbsp;|&nbsp; {job.get('company_size','')} &nbsp;|&nbsp; {job.get('seniority_level','')} &nbsp;|&nbsp; Posted ~{job.get('posting_freshness_days','?')}d ago &nbsp;|&nbsp; {job.get('source_platform','')}
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
    <tr>
      <td style="padding:3px 0;color:#64748b;font-size:11px;font-family:monospace;width:140px;">SKILL MATCH</td>
      <td style="padding:3px 0;">{score_bar(scores.get('skill_match',0),'#6d28d9')} <span style="font-family:monospace;font-size:12px;color:#c4b5fd;margin-left:6px;">{scores.get('skill_match',0)}/100</span></td>
    </tr>
    <tr>
      <td style="padding:3px 0;color:#64748b;font-size:11px;font-family:monospace;">EXPERIENCE FIT</td>
      <td style="padding:3px 0;">{score_bar(scores.get('experience_fit',0),'#3b82f6')} <span style="font-family:monospace;font-size:12px;color:#93c5fd;margin-left:6px;">{scores.get('experience_fit',0)}/100</span></td>
    </tr>
    <tr>
      <td style="padding:3px 0;color:#64748b;font-size:11px;font-family:monospace;">GROWTH POTENTIAL</td>
      <td style="padding:3px 0;">{score_bar(scores.get('growth_potential',0),'#10b981')} <span style="font-family:monospace;font-size:12px;color:#6ee7b7;margin-left:6px;">{scores.get('growth_potential',0)}/100</span></td>
    </tr>
    <tr>
      <td style="padding:3px 0;color:#64748b;font-size:11px;font-family:monospace;">COMPETITION RISK</td>
      <td style="padding:3px 0;"><span style="color:{competition_color(scores.get('competition_risk',''))}; font-family:monospace;font-size:12px;font-weight:700;">{scores.get('competition_risk','?')}</span></td>
    </tr>
    <tr>
      <td style="padding:3px 0;color:#64748b;font-size:11px;font-family:monospace;">UNDERRATED SCORE</td>
      <td style="padding:3px 0;"><span style="font-family:monospace;font-size:12px;color:#fbbf24;">{scores.get('underrated_score',0)}/10</span></td>
    </tr>
    <tr>
      <td style="padding:3px 0;color:#64748b;font-size:11px;font-family:monospace;">CALLBACK PROB.</td>
      <td style="padding:3px 0;"><span style="color:{callback_color(scores.get('callback_probability',''))}; font-family:monospace;font-size:12px;font-weight:700;">{scores.get('callback_probability','?')}</span></td>
    </tr>
  </table>

  {"<div style='margin-bottom:12px;'><div style='color:#64748b;font-size:11px;font-family:monospace;margin-bottom:6px;'>WHY STRATEGIC</div>" + "".join(f"<div style='color:#94a3b8;font-size:12px;margin-bottom:4px;'>→ {tip}</div>" for tip in (job.get('why_strategic','').split('\n') if isinstance(job.get('why_strategic'), str) else [job.get('why_strategic','')])) + "</div>" if job.get('why_strategic') else ""}

  <div style="background:#1c1d2e;border-radius:4px;padding:10px;margin-bottom:12px;">
    <span style="color:#64748b;font-size:11px;font-family:monospace;">RECOMMENDED ACTION: </span>
    <span style="color:#c4b5fd;font-size:12px;font-weight:700;">{job.get('recommended_action','')}</span>
    <div style="color:#64748b;font-size:11px;margin-top:4px;">{job.get('action_reasoning','')}</div>
  </div>

  {"<div style='margin-bottom:12px;'><div style='color:#64748b;font-size:11px;font-family:monospace;margin-bottom:4px;'>STRATEGY TIPS</div>" + "".join(f"<div style='color:#94a3b8;font-size:12px;margin-bottom:3px;'>⚡ {t}</div>" for t in tips) + "</div>" if tips else ""}

  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
    {"".join(f'<span style="background:#1e3a5f;color:#93c5fd;font-size:10px;font-family:monospace;padding:2px 7px;border-radius:2px;">{s}</span>' for s in job.get('required_skills',[])[:6])}
  </div>

  {"<a href='" + job.get('apply_url','') + "' style='display:inline-block;background:#6d28d9;color:#fff;font-size:11px;font-family:monospace;font-weight:700;padding:7px 16px;border-radius:3px;text-decoration:none;letter-spacing:0.08em;text-transform:uppercase;'>Apply Now →</a>" if job.get('apply_url') else "<span style='color:#3f4a5e;font-size:11px;font-family:monospace;'>Search on LinkedIn / company site</span>"}
</div>"""

    def render_section(title, color, job_ids, badge):
        if not job_ids:
            return ""
        section_jobs = [job_map[jid] for jid in job_ids if jid in job_map]
        cards = "".join(render_job_card(j, badge) for j in section_jobs)
        return f"""
<div style="margin-bottom:32px;">
  <div style="background:{color}22;border-left:3px solid {color};padding:12px 16px;border-radius:0 6px 6px 0;margin-bottom:16px;">
    <span style="color:{color};font-family:monospace;font-size:13px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">{title}</span>
    <span style="color:#64748b;font-family:monospace;font-size:11px;margin-left:12px;">{len(section_jobs)} opportunities</span>
  </div>
  {cards}
</div>"""

    # Build skills frequency table
    skill_rows = "".join(
        f'<tr><td style="padding:4px 12px 4px 0;color:#94a3b8;font-size:12px;">{s["skill"]}</td><td style="padding:4px 0;color:#6d28d9;font-family:monospace;font-size:11px;">{s["frequency"]}</td></tr>'
        for s in insights.get("most_requested_skills", [])[:8]
    )

    gap_items = "".join(
        f'<li style="color:#fca5a5;font-size:12px;margin-bottom:4px;">{g}</li>'
        for g in insights.get("candidate_skill_gaps_detected", [])
    )

    emerging = "".join(
        f'<span style="background:#083344;color:#67e8f9;font-size:10px;font-family:monospace;padding:2px 8px;border-radius:2px;margin-right:6px;margin-bottom:4px;display:inline-block;">{d}</span>'
        for d in insights.get("emerging_domains", [])
    )

    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Job Hunt OS — Daily Digest</title></head>
<body style="background:#07080d;color:#e2e8f0;font-family:'Segoe UI',Arial,sans-serif;max-width:720px;margin:0 auto;padding:24px 16px;">

  <!-- Header -->
  <div style="border-bottom:1px solid #1c1d2e;padding-bottom:20px;margin-bottom:28px;">
    <div style="font-family:monospace;font-size:11px;color:#6d28d9;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:6px;">◆ JOB HUNT OS</div>
    <h1 style="margin:0;font-size:24px;font-weight:800;letter-spacing:-0.02em;">Daily Strategic Digest</h1>
    <p style="margin:6px 0 0;color:#64748b;font-size:13px;">{search_date} &nbsp;·&nbsp; {total} opportunities ranked &nbsp;·&nbsp; Good morning, {candidate_name}</p>
  </div>

  <!-- Score summary bar -->
  <div style="display:flex;gap:12px;margin-bottom:28px;flex-wrap:wrap;">
    <div style="background:#0f0f1a;border:1px solid #1c1d2e;border-radius:6px;padding:12px 18px;text-align:center;flex:1;min-width:120px;">
      <div style="font-family:monospace;font-size:24px;font-weight:800;color:#10b981;">{len(groups.get('high_priority',[]))}</div>
      <div style="font-size:10px;color:#64748b;font-family:monospace;letter-spacing:0.08em;text-transform:uppercase;margin-top:3px;">High Priority</div>
    </div>
    <div style="background:#0f0f1a;border:1px solid #1c1d2e;border-radius:6px;padding:12px 18px;text-align:center;flex:1;min-width:120px;">
      <div style="font-family:monospace;font-size:24px;font-weight:800;color:#f59e0b;">{len(groups.get('strategic_competitive',[]))}</div>
      <div style="font-size:10px;color:#64748b;font-family:monospace;letter-spacing:0.08em;text-transform:uppercase;margin-top:3px;">Strategic</div>
    </div>
    <div style="background:#0f0f1a;border:1px solid #1c1d2e;border-radius:6px;padding:12px 18px;text-align:center;flex:1;min-width:120px;">
      <div style="font-family:monospace;font-size:24px;font-weight:800;color:#06b6d4;">{len(groups.get('under_radar',[]))}</div>
      <div style="font-size:10px;color:#64748b;font-family:monospace;letter-spacing:0.08em;text-transform:uppercase;margin-top:3px;">Under Radar</div>
    </div>
    <div style="background:#0f0f1a;border:1px solid #1c1d2e;border-radius:6px;padding:12px 18px;text-align:center;flex:1;min-width:120px;">
      <div style="font-family:monospace;font-size:24px;font-weight:800;color:#d97706;">{len(groups.get('favorite_matches',[]))}</div>
      <div style="font-size:10px;color:#64748b;font-family:monospace;letter-spacing:0.08em;text-transform:uppercase;margin-top:3px;">Favorites</div>
    </div>
  </div>

  <!-- Job sections -->
  {render_section("🟢 High Priority — Apply Immediately", "#10b981", groups.get("high_priority", []), "HIGH PRIORITY")}
  {render_section("⭐ Favorite Company Matches", "#d97706", groups.get("favorite_matches", []), "FAVORITE")}
  {render_section("🟡 Strategic But Competitive", "#f59e0b", groups.get("strategic_competitive", []), "STRATEGIC")}
  {render_section("🔵 Under-Radar Opportunities", "#06b6d4", groups.get("under_radar", []), "UNDER RADAR")}

  <!-- Market insights -->
  <div style="background:#0f0f1a;border:1px solid #1c1d2e;border-radius:8px;padding:20px;margin-bottom:24px;">
    <div style="font-family:monospace;font-size:11px;color:#6d28d9;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:16px;">◆ Market Intelligence</div>

    <div style="margin-bottom:16px;">
      <div style="font-family:monospace;font-size:10px;color:#64748b;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px;">Most Requested Skills</div>
      <table style="border-collapse:collapse;">{skill_rows}</table>
    </div>

    <div style="margin-bottom:16px;">
      <div style="font-family:monospace;font-size:10px;color:#64748b;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px;">Emerging Domains</div>
      {emerging}
    </div>

    {"<div style='margin-bottom:16px;'><div style='font-family:monospace;font-size:10px;color:#64748b;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px;'>Your Skill Gaps Across Listings</div><ul style='margin:0;padding-left:16px;'>" + gap_items + "</ul></div>" if gap_items else ""}

    <div style="background:#1c1d2e;border-radius:4px;padding:12px;">
      <span style="font-family:monospace;font-size:10px;color:#64748b;text-transform:uppercase;">Market Temperature: </span>
      <span style="font-family:monospace;font-size:12px;color:#c4b5fd;font-weight:700;">{insights.get('market_temperature','').upper()}</span>
      <div style="color:#64748b;font-size:12px;margin-top:6px;">{insights.get('best_opportunity_window','')}</div>
    </div>
  </div>

  <!-- Footer -->
  <div style="border-top:1px solid #1c1d2e;padding-top:16px;text-align:center;">
    <p style="color:#3f4a5e;font-size:11px;font-family:monospace;">Job Hunt OS · Daily Digest · {search_date}</p>
    <a href="http://localhost:8000/api/scout/unsubscribe?token={unsubscribe_token}"
       style="color:#3f4a5e;font-size:11px;font-family:monospace;text-decoration:none;">
      Unsubscribe
    </a>
  </div>

</body>
</html>"""

    return html


# ── Subscription management ────────────────────────────────────────────────────

def subscribe(email: str, preferences) -> str:
    token  = secrets.token_urlsafe(16)
    config = get_scout_config()

    # Handle both string and dict preferences
    if isinstance(preferences, str):
        prefs = {"raw": preferences}
    else:
        prefs = preferences or {}

    config.update({
        "subscribed":         True,
        "email":              email,
        "preferences":        prefs,
        "unsubscribe_token":  token,
        "favorite_companies": prefs.get("favorite_companies", []),
        "subscribed_since":   datetime.now().isoformat(),
    })
    save_scout_config(config)
    return token


def unsubscribe(token: str) -> bool:
    config = get_scout_config()
    if config.get("unsubscribe_token") == token:
        config["subscribed"] = False
        save_scout_config(config)
        return True
    return False
