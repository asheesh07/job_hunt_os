# backend/memory/feedback_loop.py
"""
Analyzes agent run ratings to surface performance trends.
"""
from memory.store import get_agent_logs
from typing import Dict, Optional


def get_feedback_analysis(agent: str = None) -> Dict:
    logs = get_agent_logs(agent)
    rated = [l for l in logs if l.get("rating") is not None]
    
    if not rated:
        return {
            "agent": agent or "all",
            "total_runs": len(logs),
            "rated_runs": 0,
            "avg_rating": None,
            "rating_breakdown": {},
            "message": "No rated runs yet.",
        }

    ratings = [l["rating"] for l in rated]
    avg = round(sum(ratings) / len(ratings), 2)

    breakdown = {}
    for r in range(1, 6):
        breakdown[str(r)] = ratings.count(r)

    # Per-agent breakdown if no specific agent requested
    per_agent = {}
    if not agent:
        for log in rated:
            a = log.get("agent", "unknown")
            per_agent.setdefault(a, []).append(log["rating"])
        per_agent = {
            a: round(sum(rs) / len(rs), 2)
            for a, rs in per_agent.items()
        }

    return {
        "agent": agent or "all",
        "total_runs": len(logs),
        "rated_runs": len(rated),
        "avg_rating": avg,
        "rating_breakdown": breakdown,
        "per_agent_avg": per_agent,
    }
