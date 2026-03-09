# backend/models.py
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class OrchestratorRequest(BaseModel):
    message: str

class ResumeRequest(BaseModel):
    job_description: str
    custom_resume: Optional[str] = None

class ResearchRequest(BaseModel):
    company: str
    role: Optional[str] = ""

class OutreachRequest(BaseModel):
    company: str
    role: str
    contact_name: Optional[str] = ""
    contact_title: Optional[str] = ""

class InterviewRequest(BaseModel):
    company: str
    role: str
    job_description: Optional[str] = ""

class SkillGapRequest(BaseModel):
    target_role: str
    job_description: Optional[str] = ""

class ScoutSubscribeRequest(BaseModel):
    email: str
    preferences: Optional[str] = ""

class ApplicationCreate(BaseModel):
    company: str
    role: str
    status: str = "Bookmarked"   # Bookmarked → Applied → Interview → Offer → Rejected
    job_url: Optional[str] = ""
    notes: Optional[str] = ""
    salary: Optional[str] = ""
    location: Optional[str] = ""
    contact: Optional[str] = ""

class ApplicationUpdate(BaseModel):
    status: str

class RatingRequest(BaseModel):
    log_id: str
    rating: int   # 1-5

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    resume_text: Optional[str] = None
    skills: Optional[str] = None
    projects: Optional[str] = None
    education: Optional[str] = None
    digest_email: Optional[str] = None
    digest_subscribed: Optional[bool] = None
    job_preferences: Optional[Dict[str, str]] = None