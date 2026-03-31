# backend/memory/outreach_store.py
"""
SQLite-backed outreach log.
Replaces outreach_log.json — safe for concurrent writes, queryable for pattern analysis.

Schema:
  outreach (
    id            TEXT PRIMARY KEY,
    company       TEXT NOT NULL,
    role          TEXT,
    contact       TEXT,
    mode          TEXT,
    email_subject TEXT,
    opening_hook  TEXT,
    patterns_used TEXT,   -- JSON array stored as text
    sent_at       TEXT,
    response      INTEGER,      -- NULL=pending, 1=positive, 0=negative
    response_type TEXT,         -- positive|negative|no_response|bounced
    response_at   TEXT,
    notes         TEXT
  )
"""

import sqlite3
import json
import os
from datetime import datetime
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "outreach.db")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)


@contextmanager
def _conn():
    con = sqlite3.connect(DB_PATH, check_same_thread=False, timeout=10)
    con.row_factory = sqlite3.Row
    try:
        yield con
        con.commit()
    except Exception:
        con.rollback()
        raise
    finally:
        con.close()


def init_db():
    with _conn() as con:
        con.execute("""
            CREATE TABLE IF NOT EXISTS outreach (
                id            TEXT PRIMARY KEY,
                company       TEXT NOT NULL,
                role          TEXT,
                contact       TEXT,
                mode          TEXT,
                email_subject TEXT,
                opening_hook  TEXT,
                patterns_used TEXT,
                sent_at       TEXT,
                response      INTEGER,
                response_type TEXT,
                response_at   TEXT,
                notes         TEXT
            )
        """)
        con.execute("CREATE INDEX IF NOT EXISTS idx_company ON outreach(company)")
        con.execute("CREATE INDEX IF NOT EXISTS idx_mode ON outreach(mode)")
        con.execute("CREATE INDEX IF NOT EXISTS idx_response ON outreach(response)")


def save_outreach(entry: dict) -> str:
    init_db()
    with _conn() as con:
        con.execute("""
            INSERT OR REPLACE INTO outreach
              (id, company, role, contact, mode, email_subject, opening_hook,
               patterns_used, sent_at, response, response_type, response_at, notes)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            entry["id"],
            entry.get("company", ""),
            entry.get("role", ""),
            entry.get("contact", ""),
            entry.get("mode", ""),
            entry.get("email_subject", ""),
            entry.get("opening_hook", ""),
            json.dumps(entry.get("patterns_used", [])),
            entry.get("sent_at", datetime.now().isoformat()),
            entry.get("response"),
            entry.get("response_type"),
            entry.get("response_at"),
            entry.get("notes", ""),
        ))
    return entry["id"]


def record_response(outreach_id: str, response_type: str, notes: str = "") -> dict:
    init_db()
    is_positive = 1 if response_type == "positive" else 0
    now = datetime.now().isoformat()
    with _conn() as con:
        cur = con.execute(
            "SELECT id FROM outreach WHERE id = ?", (outreach_id,)
        )
        if not cur.fetchone():
            return {"error": f"Outreach ID {outreach_id} not found"}
        con.execute("""
            UPDATE outreach
            SET response=?, response_type=?, response_at=?, notes=?
            WHERE id=?
        """, (is_positive, response_type, now, notes, outreach_id))
    return {"recorded": True, "outreach_id": outreach_id, "response_type": response_type}


from typing import Optional

def get_outreach_by_id(outreach_id: str) -> Optional[dict]:
    init_db()
    with _conn() as con:
        cur = con.execute("SELECT * FROM outreach WHERE id = ?", (outreach_id,))
        row = cur.fetchone()
        return _row_to_dict(row) if row else None


def get_all_outreach(limit: int = 500) -> list:
    init_db()
    with _conn() as con:
        cur = con.execute(
            "SELECT * FROM outreach ORDER BY sent_at DESC LIMIT ?", (limit,)
        )
        return [_row_to_dict(r) for r in cur.fetchall()]


def get_responded() -> list:
    init_db()
    with _conn() as con:
        cur = con.execute(
            "SELECT * FROM outreach WHERE response = 1 ORDER BY response_at DESC"
        )
        return [_row_to_dict(r) for r in cur.fetchall()]


def get_no_response() -> list:
    init_db()
    with _conn() as con:
        cur = con.execute(
            "SELECT * FROM outreach WHERE response = 0 OR response IS NULL ORDER BY sent_at DESC"
        )
        return [_row_to_dict(r) for r in cur.fetchall()]


def get_response_rate_by_mode() -> list:
    """Response rate grouped by outreach mode — used by pattern analysis."""
    init_db()
    with _conn() as con:
        cur = con.execute("""
            SELECT
                mode,
                COUNT(*) as total,
                SUM(CASE WHEN response = 1 THEN 1 ELSE 0 END) as responded,
                ROUND(
                    100.0 * SUM(CASE WHEN response = 1 THEN 1 ELSE 0 END)
                    / NULLIF(COUNT(*), 0),
                    1
                ) as response_rate_pct
            FROM outreach
            WHERE response_type IS NOT NULL
            GROUP BY mode
            ORDER BY response_rate_pct DESC
        """)
        return [dict(r) for r in cur.fetchall()]


def get_response_rate_by_company_type(applications: list) -> list:
    """
    Cross-reference outreach log with application company_type field.
    Returns response rate per company type.
    Requires applications list from store (outreach DB doesn't store company_type directly).
    """
    company_to_type = {a.get("company", "").lower(): a.get("company_type", "unknown")
                       for a in applications}
    init_db()
    with _conn() as con:
        cur = con.execute("SELECT company, response FROM outreach WHERE response_type IS NOT NULL")
        rows = cur.fetchall()

    by_type: dict = {}
    for row in rows:
        ctype = company_to_type.get(row["company"].lower(), "unknown")
        if ctype not in by_type:
            by_type[ctype] = {"total": 0, "responded": 0}
        by_type[ctype]["total"] += 1
        if row["response"] == 1:
            by_type[ctype]["responded"] += 1

    return [
        {
            "company_type": ct,
            "total": d["total"],
            "responded": d["responded"],
            "response_rate_pct": round(100 * d["responded"] / d["total"], 1) if d["total"] else 0,
        }
        for ct, d in sorted(by_type.items(), key=lambda x: -x[1]["responded"])
    ]


def get_winning_hooks(limit: int = 10) -> list:
    """Subject lines and opening hooks from messages that got positive responses."""
    init_db()
    with _conn() as con:
        cur = con.execute("""
            SELECT email_subject, opening_hook, mode, company, patterns_used
            FROM outreach
            WHERE response = 1
            ORDER BY response_at DESC
            LIMIT ?
        """, (limit,))
        return [_row_to_dict(r) for r in cur.fetchall()]


def get_bombed_hooks(limit: int = 10) -> list:
    """Subject lines and opening hooks from messages that got no response."""
    init_db()
    with _conn() as con:
        cur = con.execute("""
            SELECT email_subject, opening_hook, mode, company
            FROM outreach
            WHERE response = 0 OR response_type = 'no_response'
            ORDER BY sent_at DESC
            LIMIT ?
        """, (limit,))
        return [_row_to_dict(r) for r in cur.fetchall()]


def get_stats() -> dict:
    init_db()
    with _conn() as con:
        cur = con.execute("""
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN response = 1 THEN 1 ELSE 0 END) as responded,
                SUM(CASE WHEN response = 0 THEN 1 ELSE 0 END) as no_response,
                SUM(CASE WHEN response IS NULL THEN 1 ELSE 0 END) as pending
            FROM outreach
        """)
        row = dict(cur.fetchone())
        total = row["total"] or 0
        responded = row["responded"] or 0
        row["response_rate_pct"] = round(100 * responded / total, 1) if total > 0 else 0
        return row


def _row_to_dict(row) -> dict:
    d = dict(row)
    if d.get("patterns_used"):
        try:
            d["patterns_used"] = json.loads(d["patterns_used"])
        except (json.JSONDecodeError, TypeError):
            d["patterns_used"] = []
    return d