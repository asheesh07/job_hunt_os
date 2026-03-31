# backend/orchestrator.py

import os
import json, re
from huggingface_hub import InferenceClient
from memory.store import get_profile

client = InferenceClient(api_key=os.environ.get("HF_TOKEN"))

ROUTER_PROMPT = """You are an AI task router for a job search platform.
Classify the user's request and identify which agents to run.

Available agents:
- resume: Analyze resume against JD, ATS score, rewrite bullets
- research: Research a company (culture, tech stack, interview process)
- outreach: Write cold emails and LinkedIn messages
- interview: Generate interview questions and model answers
- skill_gap: Analyze skill gaps and create learning roadmap
- job_scout: Search for job openings

Respond ONLY with JSON:
{
  "intent": "one line description",
  "agents": ["agent1", "agent2"],
  "params": {
    "company": "extracted company name or null",
    "role": "extracted role or null",
    "job_description": "extracted JD text or null"
  },
  "execution": "sequential or parallel"
}"""


def classify_task(user_message: str) -> dict:
    response = client.chat.completions.create(
        model="Qwen/Qwen2.5-72B-Instruct",
        max_tokens=300,
        messages=[
            {"role": "system", "content": ROUTER_PROMPT},
            {"role": "user", "content": user_message},
        ]
    )
    text = response.choices[0].message.content
    match = re.search(r'\{.*\}', text, re.DOTALL)
    return json.loads(match.group()) if match else {
        "agents": ["research"],
        "params": {},
        "intent": user_message[:100],
        "execution": "sequential",
    }


def run_task(user_message: str) -> dict:
    """Full orchestration pipeline."""
    routing = classify_task(user_message)
    agents  = routing.get("agents", [])
    params  = routing.get("params", {})
    results = {}

    company = params.get("company", "")
    role    = params.get("role", "")
    jd      = params.get("job_description", "")

    for agent_name in agents:
        try:
            if agent_name == "resume":
                from agents.resume_agent import run
                results["resume"] = run(jd or user_message)

            elif agent_name == "research":
                from agents.research_agent import run
                results["research"] = run(company or user_message, role)

            elif agent_name == "outreach":
                from agents.outreach_agent import run
                results["outreach"] = run(company, role)

            elif agent_name == "interview":
                from agents.interview_agent import run
                results["interview"] = run(company, role, jd)

            elif agent_name == "skill_gap":
                from agents.skill_gap_agent import run
                results["skill_gap"] = run(role or user_message, jd)

            elif agent_name == "job_scout":
                from agents.job_scout_agent import run
                results["job_scout"] = run()

        except Exception as e:
            results[agent_name] = {"error": str(e)}

    return {
        "intent":   routing.get("intent", ""),
        "agents_run": agents,
        "params":   params,
        "results":  results,
    }
