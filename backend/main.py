import os
import sys
import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(__file__))

from loop_routes import loop_router
load_dotenv()

from models import (
    OrchestratorRequest, ResumeRequest, ResearchRequest,
    OutreachRequest, InterviewRequest, SkillGapRequest,
    ScoutSubscribeRequest, ApplicationCreate, ApplicationUpdate,
    RatingRequest, ProfileUpdate,
)
from orchestrator import run_task
from memory.store import (
    get_applications, save_application, update_application_status,
    delete_application, get_profile, save_profile,
    get_agent_logs, rate_agent_run, get_scout_config,
)
from memory.feedback_loop import get_feedback_analysis
from scheduler.daily_digest import start_scheduler, stop_scheduler
from interview_routes import interview_router
from outreach_routes import outreach_router
from research_routes import research_router
from resume_routes import resume_router
from skill_gap_routes import skill_gap_router

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()
    
app = FastAPI(title="Job Hunt OS", version="2.0.0",lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000","https://job-hunt-os.vercel.app","*" ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(interview_router, prefix="/api/interview/v2")
app.include_router(outreach_router, prefix="/api/outreach")
app.include_router(research_router, prefix="/api/research")
app.include_router(resume_router, prefix="/api/resume")
app.include_router(skill_gap_router, prefix="/api/skill-gap")
app.include_router(loop_router, prefix="/api/loop")

@app.get("/")
def health():
    return {"status": "running", "service": "Job Hunt OS", "version": "2.0.0"}

@app.post("/api/orchestrate")
def orchestrate(req: OrchestratorRequest):
    return run_task(req.message)

@app.post("/api/agents/resume")
def resume(req: ResumeRequest):
    from agents.resume_agent import run
    return run(req.job_description, req.custom_resume)

@app.post("/api/agents/research")
def research(req: ResearchRequest):
    from agents.research_agent import run
    return run(req.company, req.role)

@app.post("/api/agents/outreach")
def outreach(req: OutreachRequest):
    from agents.outreach_agent import run
    return run(req.company, req.role, req.contact_name, req.contact_title)

@app.post("/api/agents/interview")
def interview(req: InterviewRequest):
    from agents.interview_agent import run
    return run(req.company, req.role, req.job_description)

@app.post("/api/agents/skill-gap")
def skill_gap(req: SkillGapRequest):
    from agents.skill_gap_agent import run
    return run(req.target_role, req.job_description)

@app.post("/api/agents/job-scout")
def job_scout():
    from agents.job_scout_agent import run
    return run()

@app.post("/api/scout/subscribe")
def scout_subscribe(req: ScoutSubscribeRequest):
    from agents.job_scout_agent import subscribe
    token = subscribe(req.email, req.preferences)
    return {"subscribed": True, "unsubscribe_token": token}

@app.get("/api/scout/unsubscribe")
def scout_unsubscribe(token: str):
    from agents.job_scout_agent import unsubscribe
    return {"unsubscribed": unsubscribe(token)}

@app.get("/api/scout/status")
def scout_status():
    return get_scout_config()

@app.get("/api/applications")
def list_applications():
    return get_applications()

@app.post("/api/applications")
def create_application(req: ApplicationCreate):
    return save_application(req.model_dump())

@app.patch("/api/applications/{app_id}/status")
def update_status(app_id: str, req: ApplicationUpdate):
    result = update_application_status(app_id, req.status)
    if not result:
        raise HTTPException(404, "Application not found")
    return result

@app.delete("/api/applications/{app_id}")
def remove_application(app_id: str):
    if not delete_application(app_id):
        raise HTTPException(404, "Application not found")
    return {"deleted": True}

@app.get("/api/profile")
def get_profile_route():
    return get_profile()

@app.put("/api/profile")
def update_profile(req: ProfileUpdate):
    current = get_profile()
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    return save_profile({**current, **updates})

@app.get("/api/logs")
def agent_logs(agent: str = None):
    return get_agent_logs(agent)

@app.post("/api/logs/rate")
def rate_run(req: RatingRequest):
    success = rate_agent_run(req.log_id, req.rating)
    if not success:
        raise HTTPException(404, "Log not found")
    return {"rated": True}

@app.get("/api/feedback")
def feedback(agent: str = None):
    return get_feedback_analysis(agent)

@app.post("/api/hf")
async def hf_proxy(request: Request):
    body = await request.json()
    hf_token = os.environ.get("HF_TOKEN")
    model = body.pop("model", "mistralai/Mistral-7B-Instruct-v0.3")
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"https://api-inference.huggingface.co/models/{model}/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {hf_token}",
                "Content-Type": "application/json",
            },
            json=body,
        )
    return resp.json()

@app.post("/api/scout/trigger-now")
def trigger_digest_now():
    """Manually fire the daily digest immediately — for testing."""
    from scheduler.daily_digest import trigger_now
    trigger_now()
    return {"triggered": True, "message": "Digest fired. Check server logs."}

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
