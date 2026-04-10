from datetime import datetime


def calculate_risk_level(student_id: str) -> str:
    """
    Returns 'low' | 'medium' | 'high' based on:
      - attendance < 75%               → +1
      - any mark < 35% per subject      → +1 per subject
      - 2+ consecutive declining marks  → +1 per subject
      - unresolved issue > 7 days       → +1 per issue
    Score 0 → low, 1-2 → medium, 3+ → high
    """
    # Import here to avoid circular imports at module level
    from models import Attendance, StudentMark, Issue

    score = 0

    # ── 1. Attendance ──────────────────────────────────────────────────────────
    try:
        att_rows = Attendance.query.filter_by(
            student_admission_number=student_id
        ).all()
        if att_rows:
            total     = sum(a.total_classes   for a in att_rows if a.total_classes)
            attended  = sum(a.attended_classes for a in att_rows if a.attended_classes)
            if total > 0 and (attended / total) * 100 < 75:
                score += 1
    except Exception:
        pass

    # ── 2 & 3. Marks ───────────────────────────────────────────────────────────
    try:
        marks = StudentMark.query.filter_by(student_id=student_id).all()

        # Group by subject_code for per-subject analysis
        by_subject: dict[str, list] = {}
        for m in marks:
            by_subject.setdefault(m.subject_code, []).append(m)

        for subj_marks in by_subject.values():
            has_low_mark    = False
            consec_decline  = False

            for m in subj_marks:
                # Any mark < 35
                internals = [
                    v for v in (m.internal1, m.internal2, m.internal3, m.university_mark)
                    if v is not None
                ]
                if any(v < 35 for v in internals):
                    has_low_mark = True

                # 2+ consecutive declining internals
                seq = [v for v in (m.internal1, m.internal2, m.internal3) if v is not None]
                if len(seq) >= 2:
                    declines = sum(1 for i in range(1, len(seq)) if seq[i] < seq[i - 1])
                    if declines >= 2:
                        consec_decline = True

            if has_low_mark:
                score += 1
            if consec_decline:
                score += 1
    except Exception:
        pass

    # ── 4. Unresolved issues > 7 days ─────────────────────────────────────────
    try:
        open_issues = Issue.query.filter_by(student_id=student_id, status='open').all()
        now = datetime.utcnow()
        for issue in open_issues:
            if issue.raised_at and (now - issue.raised_at).days > 7:
                score += 1
    except Exception:
        pass

    if score == 0:
        return 'low'
    if score <= 2:
        return 'medium'
    return 'high'
