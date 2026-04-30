"""
routes/smart_planner_routes.py
Smart Adaptive Study Planner — Gemini-powered backend.

Endpoints:
  POST /api/ai/generate-study-plan
  POST /api/ai/chat-planner
  GET  /api/study-plan/<student_id>
  POST /api/study-plan/session/update
  GET  /api/study-plan/progress/<student_id>
  GET  /api/study-plan/preferences/<student_id>
  POST /api/study-plan/preferences/<student_id>
"""

import os, json, re
from datetime import datetime, date, timedelta
from flask import Blueprint, request, jsonify
from models import db, Student, StudentMark, Attendance, StudentAnalytics, Timetable, Faculty, Notification, MentorMessage, SubjectHandlerMessage

planner_bp = Blueprint("smart_planner", __name__, url_prefix="")


def _extract_batch_years(batch_label):
    match = re.search(r'(\d{4})\s*-\s*(\d{4})', str(batch_label or ''))
    return (int(match.group(1)), int(match.group(2))) if match else None


def _normalize_batch_label(batch_label):
    return re.sub(r'\s+', ' ', str(batch_label or '').strip().lower())


def _matches_student_batch(student_batch, row_batch):
    student_norm = _normalize_batch_label(student_batch)
    row_norm = _normalize_batch_label(row_batch)
    if row_norm == student_norm or row_norm.endswith(f" {student_norm}") or student_norm.endswith(f" {row_norm}"):
        return True
    return bool(student_norm and _extract_batch_years(row_batch) == _extract_batch_years(student_batch))


def _is_failed_mark(row):
    if row.university_mark is not None:
        return float(row.university_mark) < 40

    internals = [value for value in (row.internal1, row.internal2, row.internal3) if value is not None]
    if not internals:
        return False
    return (sum(internals) / len(internals)) < 35


def _resolve_subject_handler(student, subject_name: str):
    timetable_rows = Timetable.query.filter(Timetable.department == student.branch).all()
    timetable_rows = [row for row in timetable_rows if _matches_student_batch(student.batch, row.batch)]
    subject_rows = [row for row in timetable_rows if str(row.subject or '').strip().lower() == str(subject_name or '').strip().lower()]
    preferred_row = next((row for row in subject_rows if row.handler_id), subject_rows[0] if subject_rows else None)

    if preferred_row:
        handler_name = preferred_row.handler.name if getattr(preferred_row, "handler", None) else preferred_row.handler_name
        return {
            "handler_id": preferred_row.handler_id,
            "handler_name": handler_name or "Subject Handler",
        }

    fallback = Faculty.query.filter(
        Faculty.is_subject_handler == True,
        Faculty.status == 'Live',
        Faculty.department == student.branch,
    ).first()
    return {
        "handler_id": fallback.id if fallback else None,
        "handler_name": fallback.name if fallback else "Subject Handler",
    }


def _create_skip_alerts(student, subject_name: str, session_row: dict, reason_text: str):
    alert_body = (
        f"[Auto skip alert] {student.full_name} ({student.admission_number}) skipped the study-plan session for "
        f"{subject_name} on {session_row.get('day', 'this week')} at {session_row.get('planned_start', 'the planned time')}. "
        f"Topic: {session_row.get('topic') or 'General revision'}. "
        f"Reason shared: {reason_text}. Please track recovery support."
    )

    support_contact = _resolve_subject_handler(student, subject_name)
    if support_contact.get("handler_id"):
        db.session.add(SubjectHandlerMessage(
            student_id=student.admission_number,
            handler_id=support_contact["handler_id"],
            subject=subject_name,
            category='Skip Alert',
            message=alert_body,
            sender_role='student',
            status='open',
            is_read=False,
        ))

    if student.mentor_id:
        db.session.add(MentorMessage(
            mentor_id=student.mentor_id,
            student_id=student.admission_number,
            message=alert_body,
            sender_role='student',
            is_read=False,
        ))

    db.session.add(Notification(
        student_id=student.admission_number,
        title='Skip alert shared',
        message=f'Your mentor and {support_contact.get("handler_name", "subject handler")} were informed so they can help you recover {subject_name}.',
        type='study_plan_skip_alert',
        is_read=False,
    ))

# ─── DB helpers (raw SQL via SQLAlchemy text) ────────────────────────────────

def _ensure_tables():
    """Create planner tables if they don't exist yet (idempotent)."""
    stmts = [
        """CREATE TABLE IF NOT EXISTS sp_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT NOT NULL,
            week_start DATE,
            week_end DATE,
            generated_by_ai BOOLEAN DEFAULT 1,
            summary TEXT,
            weekly_goal TEXT,
            risk_level TEXT,
            motivational_message TEXT,
            alerts TEXT,
            raw_json TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )""",
        """CREATE TABLE IF NOT EXISTS sp_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plan_id INTEGER,
            student_id TEXT NOT NULL,
            day TEXT,
            subject TEXT,
            topic TEXT,
            session_type TEXT,
            priority TEXT DEFAULT 'medium',
            planned_start TEXT,
            planned_end TEXT,
            planned_duration_minutes INTEGER,
            actual_start TEXT,
            actual_end TEXT,
            actual_duration_minutes INTEGER,
            status TEXT DEFAULT 'not_started',
            completion_percent INTEGER DEFAULT 0,
            notes TEXT,
            difficulty_level INTEGER DEFAULT 3,
            distraction_level INTEGER DEFAULT 2,
            reason TEXT,
            FOREIGN KEY(plan_id) REFERENCES sp_plans(id)
        )""",
        """CREATE TABLE IF NOT EXISTS sp_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT NOT NULL,
            plan_id INTEGER,
            compliance_score REAL DEFAULT 0,
            completed_sessions INTEGER DEFAULT 0,
            missed_sessions INTEGER DEFAULT 0,
            planned_minutes INTEGER DEFAULT 0,
            actual_minutes INTEGER DEFAULT 0,
            high_priority_completed INTEGER DEFAULT 0,
            high_priority_total INTEGER DEFAULT 0,
            status_label TEXT DEFAULT 'Not Started',
            generated_insights TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )""",
        """CREATE TABLE IF NOT EXISTS sp_preferences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT NOT NULL UNIQUE,
            weekday_study_hours REAL DEFAULT 3,
            weekend_study_hours REAL DEFAULT 5,
            preferred_start_time TEXT DEFAULT '18:00',
            preferred_end_time TEXT DEFAULT '21:00',
            weak_subjects TEXT DEFAULT '[]',
            strong_subjects TEXT DEFAULT '[]',
            learning_style TEXT DEFAULT 'visual',
            reminder_enabled BOOLEAN DEFAULT 1,
            target_marks REAL DEFAULT 75,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )"""
    ]
    for s in stmts:
        db.session.execute(db.text(s))
    db.session.commit()


# ─── Gemini helper ───────────────────────────────────────────────────────────

def _call_gemini(prompt: str, expect_json: bool = True) -> dict | str | None:
    """Call Gemini Flash via REST. Returns parsed dict (if expect_json) or raw text."""
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        return None

    import urllib.request
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    body = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 2048}
    }).encode()

    try:
        req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req, timeout=25) as resp:
            result = json.loads(resp.read().decode())
        text = result["candidates"][0]["content"]["parts"][0]["text"]

        if not expect_json:
            return text.strip()

        # Strip markdown fences if present
        text_clean = re.sub(r"^```(?:json)?\s*", "", text.strip())
        text_clean = re.sub(r"\s*```$", "", text_clean)
        return json.loads(text_clean)

    except (json.JSONDecodeError, KeyError, Exception):
        return None


# ─── Student context builder ─────────────────────────────────────────────────

def _build_context(student_id: str) -> dict:
    student = Student.query.get(student_id.upper())
    if not student:
        return {}

    # 1. Get current semester subjects from Timetable
    timetable_rows = Timetable.query.filter(
        Timetable.department == student.branch
    ).all()
    timetable_rows = [row for row in timetable_rows if _matches_student_batch(student.batch, row.batch)]
    
    current_subjects = sorted(list(set([r.subject for r in timetable_rows if r.subject])))
    
    # 2. Get marks for context (history)
    marks = StudentMark.query.filter_by(student_id=student_id.upper()).all()
    att_rows = Attendance.query.filter_by(student_admission_number=student_id.upper()).all()
    analytics = StudentAnalytics.query.filter_by(student_id=student_id.upper()).first()

    subject_marks = {}
    backlog_subjects = []
    for m in marks:
        if m.university_mark is not None:
            subject_marks[m.subject_code] = m.university_mark
        elif m.internal1 is not None:
            vals = [v for v in [m.internal1, m.internal2, m.internal3] if v is not None]
            subject_marks[m.subject_code] = round(sum(vals) / len(vals), 1) if vals else 0
        if m.subject_code and _is_failed_mark(m):
            backlog_subjects.append(m.subject_code)

    backlog_subjects = sorted(list(dict.fromkeys([subject for subject in backlog_subjects if subject])))

    # Ensure all current subjects are in subject_marks (even if 0 history)
    for subj in current_subjects:
        if subj not in subject_marks:
            subject_marks[subj] = 0

    for subj in backlog_subjects:
        subject_marks.setdefault(subj, 0)

    # If no subjects found at all, use defaults
    if not subject_marks:
        subject_marks = {"Software Engineering": 0, "Network Security": 0, "Cloud Computing": 0}

    total_cls = sum(a.total_classes or 0 for a in att_rows)
    attended  = sum(a.attended_classes or 0 for a in att_rows)
    att_pct   = round((attended / total_cls * 100), 1) if total_cls else (analytics.attendance_percentage if analytics else 0)

    # Use only subjects that have some marks for average calculation
    valid_vals = [v for v in subject_marks.values() if v > 0]
    avg_marks = round(sum(valid_vals) / len(valid_vals), 1) if valid_vals else 0
    
    # Filter weak/strong based ONLY on current subjects (if available)
    relevant_subjects = list(dict.fromkeys((current_subjects or []) + backlog_subjects)) or list(subject_marks.keys())
    weak = [s for s in relevant_subjects if subject_marks.get(s, 0) < 60]
    strong = [s for s in relevant_subjects if subject_marks.get(s, 0) >= 75]

    # Get preferences
    row = db.session.execute(db.text(
        "SELECT * FROM sp_preferences WHERE student_id = :sid LIMIT 1"
    ), {"sid": student_id.upper()}).fetchone()
    prefs = dict(row._mapping) if row else {}

    try:
        preferred_weak = [str(item).strip() for item in json.loads(prefs.get("weak_subjects", "[]") or "[]") if str(item).strip()]
    except Exception:
        preferred_weak = []
    try:
        preferred_strong = [str(item).strip() for item in json.loads(prefs.get("strong_subjects", "[]") or "[]") if str(item).strip()]
    except Exception:
        preferred_strong = []

    weak = list(dict.fromkeys(preferred_weak + weak))
    strong = [item for item in list(dict.fromkeys(preferred_strong + strong)) if item not in weak]

    adjusted_risk = analytics.adjusted_risk if analytics and getattr(analytics, "adjusted_risk", None) is not None else (analytics.risk_score if analytics else 0)
    progress_row = db.session.execute(db.text(
        "SELECT * FROM sp_progress WHERE student_id = :sid ORDER BY updated_at DESC, id DESC LIMIT 1"
    ), {"sid": student_id.upper()}).fetchone()
    progress = dict(progress_row._mapping) if progress_row else {}

    return {
        "name": student.full_name,
        "student_id": student_id.upper(),
        "branch": student.branch or "",
        "batch": student.batch or "",
        "attendance_pct": att_pct,
        "avg_marks": avg_marks,
        "current_subjects": current_subjects,
        "backlog_subjects": backlog_subjects,
        "support_subjects": relevant_subjects,
        "subject_marks": {s: v for s, v in subject_marks.items() if s in relevant_subjects},
        "weak_subjects": weak,
        "strong_subjects": strong,
        "risk_score": adjusted_risk or 0,
        "risk_level": "high" if adjusted_risk >= 70 else "medium" if adjusted_risk >= 40 else "low",
        "weekday_hours": prefs.get("weekday_study_hours", 3),
        "weekend_hours": prefs.get("weekend_study_hours", 5),
        "preferred_start": prefs.get("preferred_start_time", "18:00"),
        "preferred_end": prefs.get("preferred_end_time", "21:00"),
        "learning_style": prefs.get("learning_style", "visual"),
        "target_marks": prefs.get("target_marks", 75),
        "planner_status": progress.get("status_label", "Not Started"),
        "planner_compliance_score": progress.get("compliance_score", 0),
        "planner_generated_insights": progress.get("generated_insights", "[]"),
    }


# ─── Fallback plan generator (no AI) ─────────────────────────────────────────

def _fallback_plan(ctx: dict) -> dict:
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    subjects = list(dict.fromkeys((ctx.get("current_subjects") or []) + (ctx.get("backlog_subjects") or []) + list(ctx["subject_marks"].keys()))) or ["General Study"]
    weak = list(dict.fromkeys((ctx.get("backlog_subjects") or []) + (ctx["weak_subjects"] or []))) or subjects
    backlog_set = set(ctx.get("backlog_subjects") or [])

    # Sort: weak subjects first
    ordered = sorted(subjects, key=lambda s: (0 if s in backlog_set else 1, 0 if s in weak else 1, ctx["subject_marks"].get(s, 50)))

    start_h, start_m = map(int, ctx["preferred_start"].split(":"))

    daily_plan = []
    for i, day in enumerate(days):
        is_weekend = day in ("Saturday", "Sunday")
        hours = ctx["weekend_hours"] if is_weekend else ctx["weekday_hours"]
        sessions = []
        slot_start = start_h * 60 + start_m
        h = 0
        j = 0
        while h < hours and j < 3:
            subj = ordered[(i + j) % len(ordered)]
            is_backlog = subj in backlog_set
            dur = 120 if is_backlog and (day in ("Saturday", "Sunday") or j == 0) else 90 if subj in weak else 60
            prio = "high" if is_backlog or subj in weak[:2] else "medium" if subj in weak else "low"
            s_hr, s_min = divmod(slot_start, 60)
            e_hr, e_min = divmod(slot_start + dur, 60)
            sessions.append({
                "startTime": f"{s_hr:02d}:{s_min:02d}",
                "endTime": f"{e_hr:02d}:{e_min:02d}",
                "subject": subj,
                "topic": (
                    "Backlog recovery: rebuild concepts and close note gaps" if is_backlog and j == 0
                    else "Concept review & notes" if j == 0
                    else "Practice problems" if j == 1
                    else "Past paper revision"
                ),
                "type": "revision" if is_backlog and j == 0 else "concept" if j == 0 else "practice",
                "priority": prio,
                "reason": (
                    "Failed subject recovery block scheduled in addition to the current semester timetable."
                    if is_backlog else
                    "Weak subject requiring extra focus" if subj in weak else
                    "Regular review to maintain progress"
                )
            })
            slot_start += dur + 15  # 15-min break
            h += dur / 60
            j += 1
        daily_plan.append({"day": day, "sessions": sessions})

    avg = ctx["avg_marks"]
    risk = ctx["risk_level"]
    return {
        "summary": f"Personalized plan for {ctx['name']}. Attendance: {ctx['attendance_pct']}%, Avg marks: {avg}, with extra recovery hours for backlog subjects.",
        "riskLevel": risk,
        "weeklyGoal": f"Complete all sessions, protect class attendance, and move backlog subjects toward a safe pass level.",
        "dailyPlan": daily_plan,
        "focusSubjects": [{
            "subject": s,
            "reason": "Backlog subject needs recovery hours" if s in backlog_set else "Marks below 60%",
            "recommendedHours": 5 if s in backlog_set else 4
        } for s in weak[:4]],
        "assignmentPlan": [],
        "motivationalMessage": "You are behind, but this is recoverable. Focus on the next 2 sessions first.",
        "alerts": [f"Attendance is {ctx['attendance_pct']}% - target 75%"] if ctx["attendance_pct"] < 75 else [],
    }


# ─── Routes ──────────────────────────────────────────────────────────────────

@planner_bp.before_app_request
def setup_tables():
    pass  # Tables created at app startup via init_smart_planner()


def init_smart_planner(app):
    """Call this once at app startup."""
    with app.app_context():
        _ensure_tables()
    app.register_blueprint(planner_bp)


# POST /api/ai/generate-study-plan
@planner_bp.route("/api/ai/generate-study-plan", methods=["POST"])
def api_generate_study_plan():
    data = request.get_json(force=True) or {}
    student_id = data.get("student_id", "").upper()
    if not student_id:
        return jsonify({"success": False, "message": "student_id required"}), 400

    ctx = _build_context(student_id)
    if not ctx:
        return jsonify({"success": False, "message": "Student not found"}), 404

    # Build Gemini prompt
    current_str = ", ".join(ctx["current_subjects"]) or "no data"
    backlog_str = ", ".join(ctx.get("backlog_subjects", [])) or "none"
    allowed_subjects = list(dict.fromkeys((ctx.get("current_subjects") or []) + (ctx.get("backlog_subjects") or [])))
    allowed_subjects_str = ", ".join(allowed_subjects) or current_str
    marks_str = ", ".join(f"{s}: {v}" for s, v in ctx["subject_marks"].items() if v > 0) or "no history yet"
    weak_str  = ", ".join(ctx["weak_subjects"]) or "none"
    strong_str = ", ".join(ctx["strong_subjects"]) or "none"

    prompt = f"""You are an AI academic coach. Generate a personalized weekly study plan for a student.

Student Profile:
- Name: {ctx['name']}
- Branch: {ctx['branch']}
- Current Semester Subjects: {current_str}
- Failed / backlog subjects that still need recovery hours: {backlog_str}
- Attendance: {ctx['attendance_pct']}%
- Average Historical Marks: {ctx['avg_marks']}
- Recent History Marks (if any): {marks_str}
- Risk Level: {ctx['risk_level']}
- Prioritize these subjects (low marks/concerns): {weak_str}
- Strengths: {strong_str}
- Weekday study hours: {ctx['weekday_hours']}h
- Weekend study hours: {ctx['weekend_hours']}h
- Preferred start time: {ctx['preferred_start']}
- Learning style: {ctx['learning_style']}
- Overall Target: {ctx['target_marks']}%

IMPORTANT: The study plan MUST use only these subjects: {allowed_subjects_str}.
Always keep current semester subjects active.
If backlog subjects exist, add dedicated recovery sessions for them in addition to current-semester study blocks.

Respond ONLY with valid JSON (no markdown, no explanation). Use this exact structure:
{{
  "summary": "short friendly summary",
  "riskLevel": "low|medium|high",
  "weeklyGoal": "main goal for this week",
  "dailyPlan": [
    {{
      "day": "Monday",
      "sessions": [
        {{
          "startTime": "18:00",
          "endTime": "19:30",
          "subject": "Subject Name",
          "topic": "specific topic to cover",
          "type": "concept|practice|revision|assignment",
          "priority": "low|medium|high",
          "reason": "why this session"
        }}
      ]
    }}
  ],
  "focusSubjects": [{{"subject": "name", "reason": "why", "recommendedHours": 3}}],
  "assignmentPlan": [{{"assignment": "name", "deadline": "2026-04-25", "suggestedWorkDate": "2026-04-23"}}],
  "motivationalMessage": "short encouraging message",
  "alerts": ["alert string"]
}}
Include all 7 days. Put weak subjects in high-priority morning/evening sessions. No extra text."""

    plan_json = _call_gemini(prompt, expect_json=True)
    source = "gemini"
    if not plan_json:
        plan_json = _fallback_plan(ctx)
        source = "fallback"

    # Retry once if invalid structure
    if not isinstance(plan_json.get("dailyPlan"), list):
        plan_json = _fallback_plan(ctx)
        source = "fallback"

    # Save to DB
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end   = week_start + timedelta(days=6)

    db.session.execute(db.text(
        "DELETE FROM sp_sessions WHERE student_id = :sid AND plan_id IN (SELECT id FROM sp_plans WHERE student_id = :sid AND week_start = :ws)"
    ), {"sid": student_id, "ws": str(week_start)})
    db.session.execute(db.text(
        "DELETE FROM sp_plans WHERE student_id = :sid AND week_start = :ws"
    ), {"sid": student_id, "ws": str(week_start)})

    res = db.session.execute(db.text(
        """INSERT INTO sp_plans (student_id, week_start, week_end, generated_by_ai, summary, weekly_goal,
           risk_level, motivational_message, alerts, raw_json)
           VALUES (:sid, :ws, :we, 1, :summary, :goal, :risk, :msg, :alerts, :raw)"""
    ), {
        "sid": student_id, "ws": str(week_start), "we": str(week_end),
        "summary": plan_json.get("summary", ""),
        "goal": plan_json.get("weeklyGoal", ""),
        "risk": plan_json.get("riskLevel", "medium"),
        "msg": plan_json.get("motivationalMessage", ""),
        "alerts": json.dumps(plan_json.get("alerts", [])),
        "raw": json.dumps(plan_json),
    })
    plan_id = res.lastrowid

    # Insert sessions
    for day_entry in plan_json.get("dailyPlan", []):
        for sess in day_entry.get("sessions", []):
            st = sess.get("startTime", "18:00")
            et = sess.get("endTime", "19:00")
            try:
                sh, sm = map(int, st.split(":"))
                eh, em = map(int, et.split(":"))
                dur = (eh * 60 + em) - (sh * 60 + sm)
            except Exception:
                dur = 60
            db.session.execute(db.text(
                """INSERT INTO sp_sessions (plan_id, student_id, day, subject, topic, session_type,
                   priority, planned_start, planned_end, planned_duration_minutes, status, reason)
                   VALUES (:pid, :sid, :day, :subj, :topic, :type, :prio, :st, :et, :dur, 'not_started', :reason)"""
            ), {
                "pid": plan_id, "sid": student_id, "day": day_entry.get("day", ""),
                "subj": sess.get("subject", ""), "topic": sess.get("topic", ""),
                "type": sess.get("type", "concept"), "prio": sess.get("priority", "medium"),
                "st": st, "et": et, "dur": max(dur, 30), "reason": sess.get("reason", ""),
            })

    db.session.commit()
    return jsonify({"success": True, "source": source, "plan": plan_json, "plan_id": plan_id}), 200


# GET /api/study-plan/<student_id>
@planner_bp.route("/api/study-plan/<string:student_id>", methods=["GET"])
def api_get_study_plan(student_id):
    student_id = student_id.upper()
    today = date.today()
    week_start = today - timedelta(days=today.weekday())

    plan_row = db.session.execute(db.text(
        "SELECT * FROM sp_plans WHERE student_id = :sid AND week_start = :ws ORDER BY id DESC LIMIT 1"
    ), {"sid": student_id, "ws": str(week_start)}).fetchone()

    if not plan_row:
        # Try any plan
        plan_row = db.session.execute(db.text(
            "SELECT * FROM sp_plans WHERE student_id = :sid ORDER BY id DESC LIMIT 1"
        ), {"sid": student_id}).fetchone()

    if not plan_row:
        return jsonify({"success": True, "plan": None, "sessions": []}), 200

    p = dict(plan_row._mapping)
    sessions = db.session.execute(db.text(
        "SELECT * FROM sp_sessions WHERE plan_id = :pid ORDER BY day, planned_start"
    ), {"pid": p["id"]}).fetchall()
    sessions_list = [dict(r._mapping) for r in sessions]

    raw = {}
    try:
        raw = json.loads(p.get("raw_json") or "{}")
    except Exception:
        pass

    return jsonify({"success": True, "plan": {**p, **raw}, "sessions": sessions_list}), 200


# POST /api/study-plan/session/update
@planner_bp.route("/api/study-plan/session/update", methods=["POST"])
def api_update_session():
    data = request.get_json(force=True) or {}
    session_id = data.get("session_id")
    if not session_id:
        return jsonify({"success": False, "message": "session_id required"}), 400

    allowed = ["status", "completion_percent", "notes", "difficulty_level",
               "distraction_level", "actual_start", "actual_end", "actual_duration_minutes"]
    updates = {k: v for k, v in data.items() if k in allowed}
    if not updates:
        return jsonify({"success": False, "message": "No valid fields"}), 400

    sess_row = db.session.execute(db.text("SELECT * FROM sp_sessions WHERE id = :sid"), {"sid": session_id}).fetchone()
    if not sess_row:
        return jsonify({"success": False, "message": "Session not found"}), 404

    existing = dict(sess_row._mapping)
    now_text = datetime.utcnow().strftime("%H:%M")
    next_status = updates.get("status")

    if next_status == "in_progress":
        updates.setdefault("actual_start", existing.get("actual_start") or now_text)
        updates.setdefault("completion_percent", max(int(existing.get("completion_percent") or 0), 10))
    elif next_status == "completed":
        planned_minutes = int(existing.get("planned_duration_minutes") or 0)
        updates.setdefault("completion_percent", 100)
        updates.setdefault("actual_start", existing.get("actual_start") or existing.get("planned_start") or now_text)
        updates.setdefault("actual_end", now_text)
        updates.setdefault(
            "actual_duration_minutes",
            int(updates.get("actual_duration_minutes") or existing.get("actual_duration_minutes") or planned_minutes or 60),
        )
    elif next_status == "skipped":
        updates.setdefault("completion_percent", 0)
        updates.setdefault("actual_duration_minutes", int(existing.get("actual_duration_minutes") or 0))

    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    updates["sid"] = session_id
    db.session.execute(db.text(f"UPDATE sp_sessions SET {set_clause} WHERE id = :sid"), updates)

    if next_status == "skipped":
        student = Student.query.get(str(existing.get("student_id") or "").upper())
        if student:
            skip_reason = str(data.get("reason") or data.get("notes") or existing.get("notes") or "No reason shared").strip()
            _create_skip_alerts(student, str(existing.get("subject") or "General Study"), existing, skip_reason)

    db.session.commit()

    # Recalculate progress
    sess = db.session.execute(db.text("SELECT * FROM sp_sessions WHERE id = :sid"), {"sid": session_id}).fetchone()
    if sess:
        _recalc_progress(dict(sess._mapping)["student_id"])

    return jsonify({"success": True}), 200


# GET /api/study-plan/progress/<student_id>
@planner_bp.route("/api/study-plan/progress/<string:student_id>", methods=["GET"])
def api_get_progress(student_id):
    student_id = student_id.upper()
    _recalc_progress(student_id)
    row = db.session.execute(db.text(
        "SELECT * FROM sp_progress WHERE student_id = :sid ORDER BY id DESC LIMIT 1"
    ), {"sid": student_id}).fetchone()
    if not row:
        return jsonify({"success": True, "progress": None}), 200
    return jsonify({"success": True, "progress": dict(row._mapping)}), 200


def _recalc_progress(student_id: str):
    """Recalculate and upsert compliance score for a student."""
    plan_row = db.session.execute(db.text(
        "SELECT id FROM sp_plans WHERE student_id = :sid ORDER BY id DESC LIMIT 1"
    ), {"sid": student_id}).fetchone()
    if not plan_row:
        return
    plan_id = plan_row[0]

    sessions = db.session.execute(db.text(
        "SELECT * FROM sp_sessions WHERE plan_id = :pid"
    ), {"pid": plan_id}).fetchall()
    sessions = [dict(r._mapping) for r in sessions]
    total = len(sessions)
    if total == 0:
        return

    completed = [s for s in sessions if s["status"] == "completed"]
    skipped   = [s for s in sessions if s["status"] == "skipped"]
    in_progress = [s for s in sessions if s["status"] == "in_progress"]
    high_all  = [s for s in sessions if s["priority"] == "high"]
    high_done = [s for s in high_all if s["status"] == "completed"]

    planned_min = sum(s["planned_duration_minutes"] or 0 for s in sessions)
    actual_min  = sum(s["actual_duration_minutes"] or 0 for s in sessions)
    untouched_plan = len(completed) == 0 and len(skipped) == 0 and len(in_progress) == 0 and actual_min == 0

    completed_rate     = (len(completed) / total) * 100
    time_rate          = (actual_min / planned_min * 100) if planned_min else 0
    high_priority_rate = (len(high_done) / len(high_all) * 100) if high_all else 100

    score = round(
        (completed_rate * 0.5) +
        (min(time_rate, 100) * 0.3) +
        (high_priority_rate * 0.2), 1
    )

    if untouched_plan:
        label = "Ready to Start"
    elif score >= 80:
        label = "On Track"
    elif score >= 60:
        label = "Slightly Behind"
    elif score >= 40:
        label = "At Risk"
    else:
        label = "Seriously Behind"

    # Generate textual insights
    ctx = _build_context(student_id)
    weak_subjects = ctx.get("weak_subjects") or []
    attendance_pct = ctx.get("attendance_pct", 0)
    avg_marks = ctx.get("avg_marks", 0)
    insights = []
    if untouched_plan:
        first_high_priority = next((s for s in sessions if s["priority"] == "high"), None)
        if first_high_priority:
            insights.append(f"Your weekly plan is ready with {total} sessions. Start with {first_high_priority['subject']} at {first_high_priority['planned_start']} for the fastest recovery.")
        else:
            insights.append(f"Your weekly plan is ready with {total} sessions totaling {planned_min} minutes. Start the first session today so the dashboard can track real progress.")
    else:
        insights.append(f"You completed {len(completed)} of {total} planned sessions.")
    if in_progress:
        current_subjects = ", ".join(dict.fromkeys(s["subject"] for s in in_progress[:2]))
        insights.append(f"You already have active study momentum in {current_subjects}. Finish those sessions before adding new tasks.")
    if skipped:
        hp_skipped = [s for s in skipped if s["priority"] == "high"]
        if hp_skipped:
            subjects = ", ".join(set(s["subject"] for s in hp_skipped))
            insights.append(f"You skipped high-priority sessions: {subjects}.")
    if not untouched_plan and time_rate < 60 and planned_min:
        insights.append(f"Your actual study time is {round(100 - time_rate)}% below your target.")
    if weak_subjects:
        insights.append(f"Priority subjects right now: {', '.join(weak_subjects[:3])}.")
        insights.append(f"Remedial action: spend one concept-repair block and one practice block this week on {weak_subjects[0]} before moving to easier subjects.")
    if avg_marks and avg_marks < 60:
        insights.append(f"Your present marks average is {avg_marks}%. Focus on understanding core concepts first, then solve one short test after each study block.")
    if attendance_pct and attendance_pct < 75:
        insights.append(f"Attendance is {attendance_pct}%, so protecting class attendance should be part of this week's recovery plan.")
        insights.append("Attendance action: avoid missing any class this week, collect missed notes the same day, and ask your mentor for a short catch-up review if a topic is still unclear.")
    if not untouched_plan and score < 60:
        insights.append("Consider a weekend catch-up session to recover missed topics.")
    elif score >= 80:
        insights.append("Your study rhythm is strong; add one extra revision block to turn consistency into higher marks.")
    if untouched_plan:
        insights.append("Complete your first planned session and mark it done — your compliance score will start reflecting real effort immediately.")
    else:
        insights.append(f"Your compliance score is {score}/100 — {label}.")

    existing = db.session.execute(db.text(
        "SELECT id FROM sp_progress WHERE student_id = :sid AND plan_id = :pid LIMIT 1"
    ), {"sid": student_id, "pid": plan_id}).fetchone()

    if existing:
        db.session.execute(db.text(
            """UPDATE sp_progress SET compliance_score=:cs, completed_sessions=:done, missed_sessions=:missed,
               planned_minutes=:pm, actual_minutes=:am, high_priority_completed=:hd, high_priority_total=:ht,
               status_label=:label, generated_insights=:ins, updated_at=CURRENT_TIMESTAMP
               WHERE student_id=:sid AND plan_id=:pid"""
        ), {"cs": score, "done": len(completed), "missed": len(skipped), "pm": planned_min,
            "am": actual_min, "hd": len(high_done), "ht": len(high_all),
            "label": label, "ins": json.dumps(insights), "sid": student_id, "pid": plan_id})
    else:
        db.session.execute(db.text(
            """INSERT INTO sp_progress (student_id, plan_id, compliance_score, completed_sessions, missed_sessions,
               planned_minutes, actual_minutes, high_priority_completed, high_priority_total, status_label, generated_insights)
               VALUES (:sid, :pid, :cs, :done, :missed, :pm, :am, :hd, :ht, :label, :ins)"""
        ), {"sid": student_id, "pid": plan_id, "cs": score, "done": len(completed),
            "missed": len(skipped), "pm": planned_min, "am": actual_min,
            "hd": len(high_done), "ht": len(high_all), "label": label, "ins": json.dumps(insights)})
    db.session.commit()


# GET  /api/study-plan/preferences/<student_id>
@planner_bp.route("/api/study-plan/preferences/<string:student_id>", methods=["GET"])
def api_get_preferences(student_id):
    row = db.session.execute(db.text(
        "SELECT * FROM sp_preferences WHERE student_id = :sid LIMIT 1"
    ), {"sid": student_id.upper()}).fetchone()
    if not row:
        return jsonify({"success": True, "preferences": {
            "weekday_study_hours": 3, "weekend_study_hours": 5,
            "preferred_start_time": "18:00", "preferred_end_time": "21:00",
            "weak_subjects": [], "strong_subjects": [],
            "learning_style": "visual", "reminder_enabled": True, "target_marks": 75
        }}), 200
    data = dict(row._mapping)
    for f in ["weak_subjects", "strong_subjects"]:
        try:
            data[f] = json.loads(data[f] or "[]")
        except Exception:
            data[f] = []
    return jsonify({"success": True, "preferences": data}), 200


# POST /api/study-plan/preferences/<student_id>
@planner_bp.route("/api/study-plan/preferences/<string:student_id>", methods=["POST"])
def api_save_preferences(student_id):
    student_id = student_id.upper()
    data = request.get_json(force=True) or {}
    weak = json.dumps(data.get("weak_subjects", []))
    strong = json.dumps(data.get("strong_subjects", []))

    existing = db.session.execute(db.text(
        "SELECT id FROM sp_preferences WHERE student_id = :sid LIMIT 1"
    ), {"sid": student_id}).fetchone()

    vals = {
        "sid": student_id,
        "wh": data.get("weekday_study_hours", 3),
        "weh": data.get("weekend_study_hours", 5),
        "st": data.get("preferred_start_time", "18:00"),
        "et": data.get("preferred_end_time", "21:00"),
        "weak": weak, "strong": strong,
        "style": data.get("learning_style", "visual"),
        "rem": int(bool(data.get("reminder_enabled", True))),
        "tm": data.get("target_marks", 75),
    }
    if existing:
        db.session.execute(db.text(
            """UPDATE sp_preferences SET weekday_study_hours=:wh, weekend_study_hours=:weh,
               preferred_start_time=:st, preferred_end_time=:et, weak_subjects=:weak,
               strong_subjects=:strong, learning_style=:style, reminder_enabled=:rem,
               target_marks=:tm, updated_at=CURRENT_TIMESTAMP WHERE student_id=:sid"""
        ), vals)
    else:
        db.session.execute(db.text(
            """INSERT INTO sp_preferences (student_id, weekday_study_hours, weekend_study_hours,
               preferred_start_time, preferred_end_time, weak_subjects, strong_subjects,
               learning_style, reminder_enabled, target_marks)
               VALUES (:sid,:wh,:weh,:st,:et,:weak,:strong,:style,:rem,:tm)"""
        ), vals)
    db.session.commit()
    return jsonify({"success": True, "message": "Preferences saved."}), 200


# POST /api/ai/chat-planner  (study-context-aware chat)
@planner_bp.route("/api/ai/chat-planner", methods=["POST"])
def api_chat_planner():
    data = request.get_json(force=True) or {}
    student_id = data.get("admission_number", "").upper()
    message    = data.get("message", "").strip()
    history    = data.get("history", [])

    if not message:
        return jsonify({"success": False, "message": "Empty message"}), 400

    ctx = _build_context(student_id) if student_id else {}

    # Progress context
    progress_row = db.session.execute(db.text(
        "SELECT * FROM sp_progress WHERE student_id = :sid ORDER BY id DESC LIMIT 1"
    ), {"sid": student_id}).fetchone() if student_id else None
    progress = dict(progress_row._mapping) if progress_row else {}

    marks_str = ", ".join(f"{s}: {v}" for s, v in ctx.get("subject_marks", {}).items()) or "no data"
    weak_str  = ", ".join(ctx.get("weak_subjects", [])) or "none"

    system = f"""You are MentAi, a friendly and supportive academic study coach.
Student: {ctx.get('name', 'Student')}
Attendance: {ctx.get('attendance_pct', 'N/A')}%
Avg Marks: {ctx.get('avg_marks', 'N/A')}
Subject Marks: {marks_str}
Weak Subjects: {weak_str}
Risk Level: {ctx.get('risk_level', 'N/A')}
Study Compliance Score: {progress.get('compliance_score', 'N/A')}
Status: {progress.get('status_label', 'N/A')}
Completed Sessions: {progress.get('completed_sessions', 0)} / {progress.get('completed_sessions', 0) + progress.get('missed_sessions', 0)}

Rules:
- Give practical, specific, detailed, action-oriented answers.
- Explain why each recommendation matters, not only what to do.
- Use the student's current timetable subjects as the source of truth.
- Never shame the student. Use supportive language.
- If they are behind: say "You are behind, but this is recoverable."
- Never give medical or mental health advice.
- Prefer Markdown sections, bullet points, and next steps.
- Aim for 250-450 words unless the student asks for a short answer."""
    # Build conversation
    history_text = "\n".join(
        f"{'Student' if m['role']=='user' else 'Coach'}: {m['content']}"
        for m in history[-6:]
    )
    full_prompt = f"{system}\n\n{history_text}\nStudent: {message}\nCoach:"

    reply = _call_gemini(full_prompt, expect_json=False)
    source = "gemini"
    if not reply:
        # Fallback rule-based
        reply = _rule_based_chat(message, ctx, progress)
        source = "fallback"

    return jsonify({"success": True, "reply": reply, "source": source}), 200


def _rule_based_chat(msg: str, ctx: dict, progress: dict) -> str:
    msg_l = msg.lower()
    name = ctx.get("name", "there")
    weak = ctx.get("weak_subjects", [])
    att = ctx.get("attendance_pct", 0)
    subjects = ctx.get("current_subjects") or list(ctx.get("subject_marks", {}).keys()) or ["your current timetable subjects"]
    subject_line = ", ".join(subjects[:5])
    compliance = progress.get("compliance_score", "N/A")

    if any(w in msg_l for w in ["now", "study now", "what should"]):
        sub = weak[0] if weak else subjects[0]
        return f"""Hi {name}, your best move right now is **{sub}**.

**Why this is the right subject:** It is currently the highest-priority area from your timetable and performance data, so a small focused block here gives more benefit than randomly revising an easier topic.

**Do this now**
- 45 minutes: concept review from class notes.
- 10 minutes: break, water, no scrolling.
- 25 minutes: solve 5 practice questions or explain the topic aloud.
- 5 minutes: write what is still unclear and ask your subject handler or mentor.

**After the session:** Log it in the planner. Your current compliance score is **{compliance}**, so logging matters for the dashboard to reflect your real effort."""

    if any(w in msg_l for w in ["missed", "skip", "behind"]):
        return f"""You are behind, but this is **recoverable**, {name}.

Do not try to clear the whole backlog tonight. That usually creates stress and another skipped plan. Instead, recover in layers.

**Tonight**
- Pick one high-priority subject from: {subject_line}.
- Complete a 60-minute focused block.
- Finish only one clear outcome: notes, one assignment section, or one practice set.

**Tomorrow**
- Attend all classes.
- Use any 15-30 minute gap for quick recall.
- Resume the next planned session instead of rebuilding the entire schedule.

**Weekend recovery:** Keep one 90-minute catch-up block for missed topics and one 45-minute test block to check whether you actually understood them."""

    if any(w in msg_l for w in ["marks", "improve", "grades"]):
        if weak:
            return f"""To improve marks, focus first on **{', '.join(weak[:2])}**.

**Method for each subject**
- Re-read class notes and mark the exact topic you do not understand.
- Solve 10 previous or model questions without looking at the answer.
- Compare mistakes and write the pattern: formula issue, concept issue, memory issue, or careless error.
- Reattempt only the wrong questions after one day.

**Time target:** Spend about 2 hours per weak subject this week. Keep stronger subjects in light revision so they do not drop."""
        return f"""Your marks look manageable, {name}. Keep the consistency.

Use spaced repetition: revise once today, once after two days, and once before the next internal. For timetable subjects ({subject_line}), study the topic on the same day it is taught so class learning turns into exam memory."""

    if any(w in msg_l for w in ["attendance", "bunk"]):
        if att < 75:
            return f"""Your attendance is **{att}%**, which is below the usual 75% safe line.

**Priority for the next two weeks**
- Attend every class, especially repeated core subjects.
- Avoid casual leave until the percentage recovers.
- If absences were genuine, talk to your mentor early with the reason and dates.

This is important because attendance affects exam eligibility and also weakens your understanding of current topics."""
        return f"""Your attendance is **{att}%**, which is currently safe.

Keep a buffer. A few unexpected absences later can pull the percentage down quickly, so treat class hours as your first revision session. After each class, spend 10 minutes writing what was taught."""

    if any(w in msg_l for w in ["risk", "danger", "behind"]):
        risk = ctx.get("risk_level", "medium")
        return f"""Your current risk level is **{risk}**.

**Main factors**
- Attendance: **{att}%**
- Study compliance: **{compliance}**
- Weak/current subjects: {subject_line}

**How to reduce risk**
- Attend all classes this week.
- Complete the next two planner sessions without skipping.
- Submit pending assignments before adding extra revision.
- Book a mentor session if the same subject keeps appearing as weak.

Risk is not a label on you. It is a signal telling us where to act first."""

    return f"""Hi {name}, I can give detailed help using your timetable, marks, attendance, risk level, and planner progress.

You can ask:
- What should I study now?
- Make a catch-up plan for today.
- Explain my risk level.
- How do I improve marks in a subject?

For now, choose one subject from **{subject_line}**, do a 45-minute focused block, and log it. That is the fastest way to turn the planner into measurable progress."""
