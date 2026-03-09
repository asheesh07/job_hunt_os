# backend/scheduler/daily_digest.py
"""
Daily Digest Scheduler
=======================
Fires at 8:00 AM every day.
Runs full Job Scout v2 pipeline → formats HTML email → sends via SMTP.

Env vars needed (add to .env):
  SMTP_HOST   smtp.gmail.com
  SMTP_PORT   587
  SMTP_USER   youraddress@gmail.com
  SMTP_PASS   your-app-password   (Gmail: Settings → App Passwords)
"""

import os
import smtplib
import traceback
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from memory.store import get_scout_config, get_profile

scheduler = BackgroundScheduler(timezone="Asia/Kolkata")


# ── Core send logic ────────────────────────────────────────────────────────────

def send_digest():
    """Run scout pipeline and send HTML email digest."""
    config = get_scout_config()

    if not config.get("subscribed"):
        print("[Digest] No active subscription, skipping.")
        return

    email = config.get("email", "").strip()
    if not email:
        print("[Digest] No email configured, skipping.")
        return

    token    = config.get("unsubscribe_token", "")
    favs     = config.get("favorite_companies", [])
    profile  = get_profile()
    name     = profile.get("name", "Candidate")

    print(f"[Digest] Starting scout run for {email} at {datetime.now().strftime('%H:%M:%S')}")

    try:
        from agents.job_scout_agent import run as scout_run, format_email_digest

        jobs_data = scout_run(favorite_companies=favs)
        total     = jobs_data.get("total_ranked", 0)
        print(f"[Digest] Scout found {total} opportunities.")

        if total == 0:
            print("[Digest] No jobs found, skipping email.")
            return

        html_body = format_email_digest(jobs_data, token, name)
        _send_email(
            to_email  = email,
            subject   = f"🎯 Job Hunt OS — {total} Opportunities Ranked ({datetime.now().strftime('%b %d')})",
            html_body = html_body,
        )

    except Exception as e:
        print(f"[Digest] ERROR: {e}")
        traceback.print_exc()


def _send_email(to_email: str, subject: str, html_body: str):
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")

    if not smtp_user or not smtp_pass:
        # Dev mode: print preview
        print(f"[Digest] SMTP not configured. Would send to: {to_email}")
        print(f"[Digest] Subject: {subject}")
        print(f"[Digest] Body length: {len(html_body)} chars")
        print("[Digest] Add SMTP_USER and SMTP_PASS to .env to enable real sending.")
        return

    msg = MIMEMultipart("alternative")
    msg["From"]    = f"Job Hunt OS <{smtp_user}>"
    msg["To"]      = to_email
    msg["Subject"] = subject

    # Fallback plain text
    plain = f"Job Hunt OS Daily Digest\n{datetime.now().strftime('%Y-%m-%d')}\n\nOpen in a browser that supports HTML email to view your ranked opportunities.\n\nUnsubscribe: http://localhost:8000/api/scout/unsubscribe?token=YOURTOKEN"
    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=30) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        print(f"[Digest] ✓ Sent to {to_email} at {datetime.now().strftime('%H:%M:%S')}")
    except smtplib.SMTPAuthenticationError:
        print("[Digest] SMTP auth failed. For Gmail, use an App Password not your account password.")
        print("[Digest] Gmail: myaccount.google.com → Security → App Passwords")
    except smtplib.SMTPException as e:
        print(f"[Digest] SMTP error: {e}")
    except Exception as e:
        print(f"[Digest] Send failed: {e}")


# ── Scheduler lifecycle ────────────────────────────────────────────────────────

def start_scheduler():
    if not scheduler.running:
        scheduler.add_job(
            send_digest,
            trigger  = "cron",
            hour     = 8,
            minute   = 0,
            id       = "daily_digest",
            replace_existing = True,
            misfire_grace_time = 3600,  # allow up to 1hr late if server was down
        )
        scheduler.start()
        print("[Scheduler] Daily digest scheduled: 8:00 AM IST every day")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        print("[Scheduler] Stopped.")


def trigger_now():
    """Manually fire the digest immediately — useful for testing."""
    print("[Digest] Manual trigger fired.")
    send_digest()