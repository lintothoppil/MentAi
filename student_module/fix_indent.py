import sys

with open('routes/smart_planner_routes.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if 'def api_chat_planner():' in line:
        new_lines.append(line)
        new_lines.append('    data = request.get_json(force=True) or {}\n')
        new_lines.append('    student_id = data.get("admission_number", "").upper()\n')
        new_lines.append('    message    = data.get("message", "").strip()\n')
        new_lines.append('    history    = data.get("history", [])\n')
        new_lines.append('\n')
        new_lines.append('    if not message:\n')
        new_lines.append('        return jsonify({"success": False, "message": "Empty message"}), 400\n')
        new_lines.append('\n')
        new_lines.append('    ctx = _build_context(student_id) if student_id else {}\n')
        new_lines.append('\n')
        new_lines.append('    # Progress context\n')
        new_lines.append('    progress_row = db.session.execute(db.text(\n')
        new_lines.append('        "SELECT * FROM sp_progress WHERE student_id = :sid ORDER BY id DESC LIMIT 1"\n')
        new_lines.append('    ), {"sid": student_id}).fetchone() if student_id else None\n')
        new_lines.append('    progress = dict(progress_row._mapping) if progress_row else {}\n')
        new_lines.append('\n')
        new_lines.append('    marks_str = ", ".join(f"{s}: {v}" for s, v in ctx.get("subject_marks", {}).items()) or "no data"\n')
        new_lines.append('    weak_str  = ", ".join(ctx.get("weak_subjects", [])) or "none"\n')
        new_lines.append('\n')
        new_lines.append('    system = f"""You are MentAi, a friendly and supportive academic study coach.\n')
        new_lines.append('Student: {ctx.get(\'name\', \'Student\')}\n')
        new_lines.append('Attendance: {ctx.get(\'attendance_pct\', \'N/A\')}%\n')
        new_lines.append('Avg Marks: {ctx.get(\'avg_marks\', \'N/A\')}\n')
        new_lines.append('Subject Marks: {marks_str}\n')
        new_lines.append('Weak Subjects: {weak_str}\n')
        new_lines.append('Risk Level: {ctx.get(\'risk_level\', \'N/A\')}\n')
        new_lines.append('Study Compliance Score: {progress.get(\'compliance_score\', \'N/A\')}\n')
        new_lines.append('Status: {progress.get(\'status_label\', \'N/A\')}\n')
        new_lines.append('Completed Sessions: {progress.get(\'completed_sessions\', 0)} / {progress.get(\'completed_sessions\', 0) + progress.get(\'missed_sessions\', 0)}\n')
        new_lines.append('\n')
        new_lines.append('Rules:\n')
        new_lines.append('- Give practical, specific, detailed, action-oriented answers.\n')
        new_lines.append('- Explain why each recommendation matters, not only what to do.\n')
        new_lines.append('- Use the student\'s current timetable subjects as the source of truth.\n')
        new_lines.append('- Never shame the student. Use supportive language.\n')
        new_lines.append('- If they are behind: say "You are behind, but this is recoverable."\n')
        new_lines.append('- Never give medical or mental health advice.\n')
        new_lines.append('- Prefer Markdown sections, bullet points, and next steps.\n')
        new_lines.append('- Aim for 250-450 words unless the student asks for a short answer."""\n')
        skip = True
    elif skip:
        if '    # Build conversation' in line:
            skip = False
            new_lines.append(line)
    else:
        new_lines.append(line)

with open('routes/smart_planner_routes.py', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
