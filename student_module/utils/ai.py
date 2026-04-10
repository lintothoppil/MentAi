"""
Anthropic AI helpers.
Uses the raw HTTPS API via `requests` so no anthropic SDK version conflicts.
Falls back gracefully if ANTHROPIC_API_KEY is missing / API call fails.
"""
import os
import json
import requests

_ANTHROPIC_API = "https://api.anthropic.com/v1/messages"
_MODEL         = "claude-3-5-haiku-20241022"


def _headers():
    return {
        "x-api-key":         os.environ.get("ANTHROPIC_API_KEY", ""),
        "anthropic-version": "2023-06-01",
        "content-type":      "application/json",
    }


def _chat(prompt: str, max_tokens: int = 256) -> str | None:
    """Send a single-turn request. Returns text or None on failure."""
    key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not key or key.lower() in ("placeholder", "my-placeholder-key", ""):
        return None
    try:
        resp = requests.post(
            _ANTHROPIC_API,
            headers=_headers(),
            json={
                "model":      _MODEL,
                "max_tokens": max_tokens,
                "messages":   [{"role": "user", "content": prompt}],
            },
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()["content"][0]["text"].strip()
    except Exception:
        return None


# ── Public helpers ────────────────────────────────────────────────────────────

def generate_daily_goal(name: str, course: str, semester, weak_subjects: list, recent_marks: dict) -> str:
    prompt = (
        f"Student {name} is in {course}, semester {semester}. "
        f"Weak subjects: {', '.join(weak_subjects) if weak_subjects else 'None'}. "
        f"Latest marks: {json.dumps(recent_marks)}. "
        "Generate ONE personalized academic goal for today. Max 2 sentences. "
        "Return only the goal string."
    )
    result = _chat(prompt, max_tokens=120)
    return result or "Stay focused, review your weak subjects, and make progress today!"


def generate_study_plan(available_hours: float, subject_marks: dict, prayer_time: str, sports_time: str) -> dict:
    prompt = (
        f"Student has {available_hours} study hours today. "
        f"Subject marks: {json.dumps(subject_marks)}. "
        f"Prayer time: {prayer_time}. Sports: {sports_time}. "
        "Build a structured daily study timetable, focusing more on weak subjects. "
        'Return ONLY valid JSON matching: {"slots": [{"time": "HH:MM-HH:MM", '
        '"subject": "...", "activity": "...", "duration_mins": 60}]}'
    )
    raw = _chat(prompt, max_tokens=700)
    if raw:
        # Strip markdown fences if present
        text = raw.strip()
        for fence in ("```json", "```"):
            text = text.replace(fence, "")
        text = text.strip()
        try:
            return json.loads(text)
        except Exception:
            pass
    return {"slots": []}


def extract_timetable_from_image(base64_data: str, mime_type: str = "image/png") -> dict:
    """Send a vision-capable request to extract a timetable grid."""
    key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not key or key.lower() in ("placeholder", "my-placeholder-key", ""):
        return {"days": []}
    try:
        resp = requests.post(
            _ANTHROPIC_API,
            headers=_headers(),
            json={
                "model":      "claude-3-5-haiku-20241022",
                "max_tokens": 1024,
                "messages": [{
                    "role": "user",
                    "content": [
                        {"type": "image", "source": {"type": "base64", "media_type": mime_type, "data": base64_data}},
                        {"type": "text",  "text": (
                            "Extract the timetable from this image. "
                            'Return ONLY JSON: {"days":[{"day":"Monday","periods":[{"time":"9:00-10:00","subject":"Math","room":"101"}]}]}'
                        )},
                    ],
                }],
            },
            timeout=30,
        )
        resp.raise_for_status()
        raw = resp.json()["content"][0]["text"].strip()
        for fence in ("```json", "```"):
            raw = raw.replace(fence, "")
        return json.loads(raw.strip())
    except Exception:
        return {"days": []}
