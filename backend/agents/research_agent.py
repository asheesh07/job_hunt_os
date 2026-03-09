# backend/agents/research_agent.py
import os
import json, re
from huggingface_hub import InferenceClient
from memory.store import get_profile, log_agent_run

client = InferenceClient(api_key=os.environ.get("HF_TOKEN"))

SYSTEM_PROMPT = """You are a company intelligence analyst specializing in tech companies.
Research companies thoroughly for job seekers. Focus on:
- Technical culture and engineering practices
- Interview process and difficulty
- Tech stack and tools used
- Recent news, funding, products
- What the company actually looks for in candidates

Always respond in valid JSON. Be specific and actionable."""


def run(company_name: str, role: str = "") -> dict:
    prompt = f"""
Research {company_name} for a candidate applying for: {role or 'a technical role'}.

Return JSON:
{{
  "company_overview": "2-3 sentences about what the company does",
  "founded": "year",
  "size": "employee count / stage",
  "funding": "funding stage and amount if known",
  "tech_stack": ["technology1", "technology2"],
  "products": ["product1", "product2"],
  "recent_news": [
    {{"headline": "...", "relevance": "why this matters for the candidate"}}
  ],
  "engineering_culture": "paragraph on engineering culture",
  "interview_process": {{
    "rounds": ["round1", "round2", "round3"],
    "difficulty": "Easy/Medium/Hard",
    "focus_areas": ["area1", "area2"],
    "known_questions": ["type of question they ask"]
  }},
  "what_they_look_for": ["trait1", "trait2", "trait3"],
  "green_flags": ["positive signal1", "positive signal2"],
  "red_flags": ["concern1 if any"],
  "glassdoor_summary": "brief sentiment from employee reviews",
  "talking_points": ["angle to mention in interview1", "angle2"],
  "questions_to_ask": ["smart question to ask interviewer1", "question2"]
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
    result = json.loads(match.group()) if match else {"raw": text, "company": company_name}

    log_agent_run("research", {"company": company_name, "role": role}, text)
    return result


def company_deep_dive(company: str, role: str = "") -> dict:
    """Full company intelligence report."""
    return run(company, role)


def why_this_company(company: str, role: str = "", jd: str = "") -> dict:
    """Generate personalized 'Why do you want to work here?' answers."""
    profile = get_profile()

    prompt = f"""
Candidate:
Name: {profile['name']}
Background: {profile.get('resume_text', '')}
Projects: {profile.get('projects', '')}
Skills: {profile.get('skills', '')}

Company: {company}
Role: {role or 'Not specified'}
Job Description: {jd or 'Not provided'}

Generate a personalized "Why this company?" answer. Find SPECIFIC overlaps between
the candidate's actual work and the company's actual mission/products.
No generic "I love your culture" answers.

Return JSON:
{{
  "interview_answer": "2-3 paragraph spoken answer for the interview room. Specific, not generic.",
  "email_hook": "1-2 sentence opener for cold emails referencing a specific thing about the company",
  "linkedin_note_hook": "1-sentence opener for LinkedIn connection notes (under 50 words)",
  "key_overlaps": [
    {{"candidate_work": "what you built", "company_work": "what they do", "connection": "why it aligns"}}
  ],
  "specific_hooks": [
    "specific recent thing about the company to reference",
    "specific product/decision you find genuinely interesting",
    "specific problem they're solving that matches your experience"
  ],
  "what_to_avoid": ["generic phrase to avoid", "another thing that sounds like every candidate"]
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
    log_agent_run("research_why", {"company": company, "role": role}, text)
    return result


def person_intel(person_name: str, company: str, person_title: str = "", linkedin_url: str = "") -> dict:
    """Research a specific person for personalized outreach."""
    profile = get_profile()

    prompt = f"""
Research this person for personalized outreach from a job seeker:

Person: {person_name}
Title: {person_title or 'Unknown'}
Company: {company}
LinkedIn: {linkedin_url or 'Not provided'}

Candidate: {profile['name']}
Candidate background: {profile.get('resume_text', '')[:500]}

Return JSON:
{{
  "person_background": "career path and notable achievements in 2-3 sentences",
  "likely_interests": ["technical interest 1", "topic 2", "focus area 3"],
  "probable_pain_points": ["what problems they face as their role", "challenge 2"],
  "shared_interests": [
    {{"interest": "topic", "candidate_angle": "how candidate relates to this", "reference_hook": "how to bring it up"}}
  ],
  "personalization_hooks": [
    {{"hook": "specific thing to reference", "source": "LinkedIn post/talk/article", "how_to_use": "example sentence"}}
  ],
  "message_style": "how they prefer to be contacted (formal/casual/technical)",
  "what_resonates": "what kind of message they would respond to",
  "what_to_avoid": ["what would get you ignored", "thing that sounds spammy to them"],
  "connection_strength": "how strong a connection you can claim (cold/warm/referral)",
  "best_channel": "email/linkedin/twitter"
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
    result = json.loads(match.group()) if match else {"raw": text}
    log_agent_run("research_person", {"person": person_name, "company": company}, text)
    return result


def outreach_intel(company: str, person_name: str = "", person_title: str = "",
                   role: str = "", outreach_mode: str = "cold_email") -> dict:
    """Full personalization kit combining company + person research."""
    profile = get_profile()

    prompt = f"""
Generate a full outreach personalization kit for:

Sender: {profile['name']}
Background: {profile.get('resume_text', '')[:400]}
Projects: {profile.get('projects', '')}

Target Company: {company}
Contact Person: {person_name or 'Unknown'} — {person_title or 'Unknown role'}
Role applying for: {role or 'Not specified'}
Outreach mode: {outreach_mode}

Return JSON:
{{
  "subject_lines": [
    {{"subject": "...", "reasoning": "why this works"}},
    {{"subject": "...", "reasoning": "..."}},
    {{"subject": "...", "reasoning": "..."}}
  ],
  "opening_hooks": [
    {{"hook": "specific non-generic opener", "why_it_works": "..."}},
    {{"hook": "...", "why_it_works": "..."}},
    {{"hook": "...", "why_it_works": "..."}}
  ],
  "company_talking_points": [
    {{"point": "specific company fact", "how_to_weave_in": "natural sentence using this"}}
  ],
  "person_talking_points": [
    {{"point": "specific thing about the person", "source": "where to find this", "reference": "how to mention naturally"}}
  ],
  "why_this_company_oneliner": "one sentence that does not sound generic",
  "why_this_role_oneliner": "one sentence connecting your work to this role",
  "assembled_email": "fully personalized email ready to send (not a template)",
  "assembled_linkedin_note": "personalized LinkedIn note under 300 chars",
  "what_to_avoid": ["thing to avoid 1", "thing to avoid 2"]
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
    log_agent_run("research_outreach_kit", {"company": company, "person": person_name}, text)
    return result
