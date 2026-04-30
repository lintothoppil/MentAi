"""
Patches for app.py:
1. /api/handler/students - merge marks from ALL matching rows (not just first)
2. /api/handler/student/<adm>/performance - fix student_attendance column name
"""

filepath = 'app.py'
with open(filepath, 'rb') as f:
    content = f.read().decode('utf-8')

content = content.replace('\r\n', '\n')

# ─────────────────────────────────────────────────────────────────────────────
# PATCH 1: /api/handler/students — merge marks from multiple rows
# ─────────────────────────────────────────────────────────────────────────────
OLD1 = """        students = query.all()
        result = []
        for s in students:
            # Marks for this subject
            mark = StudentMark.query.filter(
                StudentMark.student_id.ilike(s.admission_number),
                StudentMark.subject_code.ilike(f'%{subject_code}%')
            ).first() if subject_code else None

            # Attendance — correct column is student_admission_number
            att_records = StudentAttendance.query.filter_by(student_admission_number=s.admission_number).all()
            total_att = len(att_records)
            present = sum(1 for a in att_records if a.status in ('P', 'Present'))
            att_pct = round((present / total_att * 100), 1) if total_att > 0 else None

            result.append({
                'admission_number': s.admission_number,
                'full_name': s.full_name,
                'email': s.email,
                'mobile_number': s.mobile_number,
                'batch': s.batch,
                'branch': s.branch,
                'marks': {
                    'internal1': mark.internal1 if mark else None,
                    'internal2': mark.internal2 if mark else None,
                    'internal3': mark.internal3 if mark else None,
                    'university_mark': mark.university_mark if mark else None,
                    'university_grade': mark.university_grade if mark else None,
                } if mark else None,
                'attendance_pct': att_pct,
            })
        return jsonify({'success': True, 'data': result})"""

NEW1 = """        students = query.all()
        result = []
        for s in students:
            # Fetch ALL mark rows for this student matching the subject
            # (internal marks and university marks may be stored in separate rows)
            if subject_code:
                marks_rows = StudentMark.query.filter(
                    StudentMark.student_id.ilike(s.admission_number),
                    StudentMark.subject_code.ilike(f'%{subject_code}%')
                ).all()
            else:
                marks_rows = []

            # Merge across all rows — take first non-None value for each field
            merged = {'internal1': None, 'internal2': None, 'internal3': None,
                      'university_mark': None, 'university_grade': None}
            for m in marks_rows:
                if m.internal1 is not None and merged['internal1'] is None:
                    merged['internal1'] = m.internal1
                if m.internal2 is not None and merged['internal2'] is None:
                    merged['internal2'] = m.internal2
                if m.internal3 is not None and merged['internal3'] is None:
                    merged['internal3'] = m.internal3
                if m.university_mark is not None and merged['university_mark'] is None:
                    merged['university_mark'] = m.university_mark
                if m.university_grade is not None and merged['university_grade'] is None:
                    merged['university_grade'] = m.university_grade

            has_any_mark = any(v is not None for v in merged.values())

            # Attendance — correct column is student_admission_number
            att_records = StudentAttendance.query.filter_by(student_admission_number=s.admission_number).all()
            total_att = len(att_records)
            present = sum(1 for a in att_records if a.status in ('P', 'Present'))
            att_pct = round((present / total_att * 100), 1) if total_att > 0 else None

            result.append({
                'admission_number': s.admission_number,
                'full_name': s.full_name,
                'email': s.email,
                'mobile_number': s.mobile_number,
                'batch': s.batch,
                'branch': s.branch,
                'marks': merged if has_any_mark else None,
                'attendance_pct': att_pct,
            })
        return jsonify({'success': True, 'data': result})"""

if OLD1 not in content:
    print("ERROR: Could not find PATCH 1 target block!")
    idx = content.find('def api_handler_students')
    print(repr(content[idx:idx+300]))
else:
    content = content.replace(OLD1, NEW1, 1)
    print("PATCH 1 applied: marks merged from all matching rows.")

# ─────────────────────────────────────────────────────────────────────────────
# PATCH 2: /api/handler/student/<adm>/performance — fix attendance column
# ─────────────────────────────────────────────────────────────────────────────
OLD2 = "        att_records = StudentAttendance.query.filter_by(student_id=adm).all()\n        total_att = len(att_records)\n        present = sum(1 for a in att_records if a.status == 'Present')"

NEW2 = "        att_records = StudentAttendance.query.filter_by(student_admission_number=adm).all()\n        total_att = len(att_records)\n        present = sum(1 for a in att_records if a.status in ('P', 'Present'))"

if OLD2 not in content:
    print("ERROR: Could not find PATCH 2 target! Trying alternate...")
    # Try to find it differently
    idx = content.find('def api_handler_student_performance')
    snippet = content[idx:idx+600]
    print(repr(snippet))
else:
    content = content.replace(OLD2, NEW2, 1)
    print("PATCH 2 applied: performance endpoint attendance column fixed.")

# Write back
with open(filepath, 'wb') as f:
    f.write(content.replace('\n', '\r\n').encode('utf-8'))
print("Done.")
