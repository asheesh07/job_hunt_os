# backend/memory/store.py
"""
Simple JSON-file persistence layer.
All data lives in backend/data/ directory.
"""
import json
import os
import uuid
from datetime import datetime
from typing import Dict, List, Optional
from profile import DEFAULT_PROFILE

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(DATA_DIR, exist_ok=True)

PROFILE_FILE     = os.path.join(DATA_DIR, "profile.json")
APPLICATIONS_FILE = os.path.join(DATA_DIR, "applications.json")
AGENT_LOGS_FILE  = os.path.join(DATA_DIR, "agent_logs.json")
SCOUT_CONFIG_FILE = os.path.join(DATA_DIR, "scout_config.json")

# ── Helpers ───────────────────────────────────────────────────────────────────

def _read(path: str, default):
    if not os.path.exists(path):
        return default
    try:
        with open(path) as f:
            return json.load(f)
    except Exception:
        return default

def _write(path: str, data):
    with open(path, "w") as f:
        json.dump(data, f, indent=2, default=str)


# ── Profile ───────────────────────────────────────────────────────────────────

def get_profile() -> Dict:
    return _read(PROFILE_FILE, dict(DEFAULT_PROFILE))

def save_profile(updates: Dict) -> Dict:
    profile = get_profile()
    profile.update({k: v for k, v in updates.items() if v is not None})
    _write(PROFILE_FILE, profile)
    return profile


# ── Applications ──────────────────────────────────────────────────────────────

def get_applications() -> List[Dict]:
    return _read(APPLICATIONS_FILE, [])

def save_application(app: Dict) -> Dict:
    apps = get_applications()
    app["id"] = str(uuid.uuid4())[:8]
    app["created_at"] = datetime.now().isoformat()
    apps.append(app)
    _write(APPLICATIONS_FILE, apps)
    return app

def update_application_status(app_id: str, status: str) -> Optional[Dict]:
    apps = get_applications()
    for a in apps:
        if a.get("id") == app_id:
            a["status"] = status
            a["updated_at"] = datetime.now().isoformat()
            _write(APPLICATIONS_FILE, apps)
            return a
    return None

def delete_application(app_id: str) -> bool:
    apps = get_applications()
    new_apps = [a for a in apps if a.get("id") != app_id]
    if len(new_apps) == len(apps):
        return False
    _write(APPLICATIONS_FILE, new_apps)
    return True


# ── Agent Logs ────────────────────────────────────────────────────────────────

def log_agent_run(agent: str, inputs: Dict, output: str) -> str:
    logs = _read(AGENT_LOGS_FILE, [])
    log_id = str(uuid.uuid4())[:8]
    logs.append({
        "id":         log_id,
        "agent":      agent,
        "inputs":     inputs,
        "output":     output[:500],
        "rating":     None,
        "created_at": datetime.now().isoformat(),
    })
    # Keep last 200 logs
    _write(AGENT_LOGS_FILE, logs[-200:])
    return log_id

def get_agent_logs(agent: str = None) -> List[Dict]:
    logs = _read(AGENT_LOGS_FILE, [])
    if agent:
        logs = [l for l in logs if l.get("agent") == agent]
    return list(reversed(logs))

def rate_agent_run(log_id: str, rating: int) -> bool:
    logs = _read(AGENT_LOGS_FILE, [])
    for log in logs:
        if log.get("id") == log_id:
            log["rating"] = rating
            _write(AGENT_LOGS_FILE, logs)
            return True
    return False


# ── Scout Config ──────────────────────────────────────────────────────────────

def get_scout_config() -> Dict:
    return _read(SCOUT_CONFIG_FILE, {
        "subscribed": False,
        "email": "",
        "preferences": {},
        "favorite_companies": [],
        "unsubscribe_token": "",
    })

def save_scout_config(config: Dict):
    _write(SCOUT_CONFIG_FILE, config)
