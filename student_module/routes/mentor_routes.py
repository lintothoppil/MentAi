"""
routes/mentor_routes.py
All mentor-only endpoints. Returns JSON.
"""
import csv
import io
from datetime import datetime, timedelta

from flask import Blueprint, request, jsonify, session

from models import (
    db, Student, Faculty, StudentMark, Attendance, Certificate,
    Issue, LeaveRequest, Appointment, MentorMessage, MentorIntervention, Notification,
)
from utils.decorators  import login_required, role_required
from utils.risk_engine import calculate_risk_level

mentor_bp = Blueprint('mentor_routes', __name__, url_prefix='/mentor')


def _my_mentor_id():
    return session.get('user_id')


# ═══════════════════════════════════════════════════════════════════
#  MENTEES
# ═══════════════════════════════════════════════════════════════════

@mentor_bp.route('/mentees', methods=['GET'])
@login_required
@role_required('mentor', 'hod')
def get_mentees():
    mid     = _my_mentor_id()
    mentees = Student.query.filter_by(mentor_id=mid).all()
    result  = []
    for s in mentees:
        att_rows    = Attendance.query.filter_by(student_admission_number=s.admission_number).all()
        total       = sum(a.total_classes    for a in att_rows if a.total_classes)
        attended    = sum(a.attended_classes for a in att_rows if a.attended_classes)
        att_pct     = round((attended / total) * 100, 1) if total else 0.0
        latest_mark = _latest_avg_marks(s.admission_number)
        risk        = calculate_risk_level(s.admission_number)

        result.append({
            'admission_number':  s.admission_number,
            'name':              s.full_name,
            'batch':             s.batch,
            'attendance_percent': att_pct,
            'latest_marks':      latest_mark,
            'risk_level':        risk,
            'last_meeting_date': None,
        })
    return jsonify({'status': 'ok', 'data': result}), 200


def _latest_avg_marks(s_id: str):
    marks = StudentMark.query.filter_by(student_id=s_id).all()
    vals  = [m.internal1 for m in marks if m.internal1 is not None]
    return round(sum(vals) / len(vals), 2) if vals else None


@mentor_bp.route('/mentees/<admission_number>', methods=['GET'])
@login_required
@role_required('mentor', 'hod')
def get_mentee_detail(admission_number):
    s = Student.query.get_or_404(admission_number)
    if s.mentor_id != _my_mentor_id() and session.get('role') != 'hod':
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 403
    p  = s.parents
    ac = s.academics
    return jsonify({'status': 'ok', 'data': {
        'admission_number': s.admission_number,
        'full_name':        s.full_name,
        'email':            s.email,
        'branch':           s.branch,
        'batch':            s.batch,
        'status':           s.status,
        'profile_completed': s.profile_completed,
        'risk_level':       calculate_risk_level(admission_number),
        'parent': {
            'father_name':   p.father_name   if p else None,
            'father_mobile': p.father_mobile if p else None,
            'mother_name':   p.mother_name   if p else None,
            'mother_mobile': p.mother_mobile if p else None,
        } if p else None,
        'academics': {
            'percentage_10th': ac.percentage_10th if ac else None,
            'sgpa': ac.sgpa if ac else None,
            'cgpa': ac.cgpa if ac else None,
        } if ac else None,
    }}), 200


@mentor_bp.route('/mentees/<admission_number>/marks', methods=['GET'])
@login_required
@role_required('mentor', 'hod')
def get_mentee_marks(admission_number):
    marks = StudentMark.query.filter_by(student_id=admission_number).all()
    return jsonify({'status': 'ok', 'data': [{
        'subject_code':   m.subject_code,
        'semester':       m.semester,
        'internal1':      m.internal1,
        'internal2':      m.internal2,
        'internal3':      m.internal3,
        'university_mark': m.university_mark,
    } for m in marks]}), 200


@mentor_bp.route('/mentees/<admission_number>/attendance', methods=['GET'])
@login_required
@role_required('mentor', 'hod')
def get_mentee_attendance(admission_number):
    rows = Attendance.query.filter_by(student_admission_number=admission_number).all()
    return jsonify({'status': 'ok', 'data': [{
        'subject_name':    a.subject_name,
        'subject_code':    a.subject_code,
        'semester':        a.semester,
        'total_classes':   a.total_classes,
        'attended_classes': a.attended_classes,
        'percentage':      a.percentage,
    } for a in rows]}), 200


@mentor_bp.route('/mentees/<admission_number>/certificates', methods=['GET'])
@login_required
@role_required('mentor', 'hod')
def get_mentee_certificates(admission_number):
    return jsonify({
        'status': 'error',
        'message': 'Access denied: Mentor cannot view student certificates',
    }), 403


@mentor_bp.route('/mentees/<admission_number>/issues', methods=['GET'])
@login_required
@role_required('mentor', 'hod')
def get_mentee_issues(admission_number):
    issues = Issue.query.filter_by(student_id=admission_number).all()
    return jsonify({'status': 'ok', 'data': [{
        'id':          i.id,
        'category':    i.category,
        'subject':     i.subject,
        'status':      i.status,
        'raised_at':   i.raised_at.isoformat() if i.raised_at else None,
        'resolution':  i.resolution_notes,
    } for i in issues]}), 200


@mentor_bp.route('/mentees/<admission_number>/leaves', methods=['GET'])
@login_required
@role_required('mentor', 'hod')
def get_mentee_leaves(admission_number):
    leaves = LeaveRequest.query.filter_by(student_admission_number=admission_number).all()
    return jsonify({'status': 'ok', 'data': [{
        'id':        l.id,
        'type':      l.type,
        'from_date': str(l.from_date) if l.from_date else None,
        'to_date':   str(l.to_date)   if l.to_date   else None,
        'reason':    l.reason,
        'status':    l.status,
    } for l in leaves]}), 200


# ═══════════════════════════════════════════════════════════════════
#  MARKS UPLOAD
# ═══════════════════════════════════════════════════════════════════

@mentor_bp.route('/marks/upload', methods=['POST'])
@login_required
@role_required('mentor')
def upload_marks():
    mid          = _my_mentor_id()
    file         = request.files.get('file')
    subject_code = request.form.get('subject_code', '')
    exam_type    = request.form.get('exam_type', 'internal1')
    if not file:
        return jsonify({'status': 'error', 'message': 'No file'}), 400

    content = file.stream.read().decode('utf-8', errors='replace')
    rows    = list(csv.DictReader(io.StringIO(content, newline=None)))

    success  = 0
    failed   = []
    my_admns = {s.admission_number for s in Student.query.filter_by(mentor_id=mid).all()}

    for row in rows:
        adm   = str(row.get('admission_number', '')).strip().upper()
        marks = row.get('marks', '')
        if adm not in my_admns:
            failed.append({'admission_number': adm, 'reason': 'Not your mentee'})
            continue
        try:
            mark_val = float(marks)
        except (ValueError, TypeError):
            failed.append({'admission_number': adm, 'reason': 'Invalid mark value'})
            continue

        m = StudentMark.query.filter_by(student_id=adm, subject_code=subject_code).first()
        if not m:
            m = StudentMark(student_id=adm, subject_code=subject_code, exam_type=exam_type)
            db.session.add(m)

        field = exam_type if exam_type in ('internal1', 'internal2', 'internal3', 'university_mark') else 'internal1'
        setattr(m, field, mark_val)
        success += 1

    db.session.commit()
    return jsonify({'status': 'ok', 'data': {'success': success, 'failed': failed}}), 200


# ═══════════════════════════════════════════════════════════════════
#  APPOINTMENTS
# ═══════════════════════════════════════════════════════════════════

@mentor_bp.route('/appointments', methods=['GET'])
@login_required
@role_required('mentor')
def get_appointments():
    mid   = _my_mentor_id()
    appts = Appointment.query.filter_by(mentor_id=mid).order_by(Appointment.created_at.desc()).all()
    return jsonify({'status': 'ok', 'data': [{
        'id':             a.id,
        'student_id':     a.student_id,
        'preferred_date': str(a.preferred_date),
        'preferred_time': str(a.preferred_time),
        'mode':           a.mode,
        'status':         a.status,
        'notes':          a.notes,
        'meeting_link':   a.meeting_link,
    } for a in appts]}), 200


@mentor_bp.route('/appointments/<int:a_id>', methods=['PATCH'])
@login_required
@role_required('mentor')
def update_appointment(a_id):
    mid  = _my_mentor_id()
    appt = Appointment.query.get_or_404(a_id)
    if appt.mentor_id != mid:
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 403

    data   = request.get_json(force=True) or {}
    status = data.get('status')
    if status:
        appt.status = status
    if 'meeting_link' in data:
        appt.meeting_link = data['meeting_link']
    if 'reschedule_date' in data:
        try:
            appt.reschedule_date = datetime.strptime(data['reschedule_date'], '%Y-%m-%d').date()
        except Exception:
            pass
    if 'reschedule_time' in data:
        try:
            appt.reschedule_time = datetime.strptime(data['reschedule_time'], '%H:%M').time()
        except Exception:
            pass

    if status == 'approved' and appt.mode == 'online' and not appt.meeting_link:
        return jsonify({'status': 'error', 'message': 'meeting_link required for online appointments'}), 400

    # Notify student
    db.session.add(Notification(
        student_id=appt.student_id,
        title='Appointment Update',
        message=f'Your appointment has been {status}.' if status else 'Appointment updated.',
        type='appointment',
        is_read=False,
    ))
    db.session.commit()
    return jsonify({'status': 'ok', 'message': 'Appointment updated.'}), 200


# ═══════════════════════════════════════════════════════════════════
#  MESSAGES
# ═══════════════════════════════════════════════════════════════════

@mentor_bp.route('/messages/send', methods=['POST'])
@login_required
@role_required('mentor')
def send_message():
    mid  = _my_mentor_id()
    data = request.get_json(force=True) or {}
    adm  = data.get('admission_number')
    text = data.get('message', '').strip()
    if not adm or not text:
        return jsonify({'status': 'error', 'message': 'admission_number and message required'}), 400

    msg = MentorMessage(mentor_id=mid, student_id=adm, message=text, sender_role='mentor')
    db.session.add(msg)
    db.session.commit()
    return jsonify({'status': 'ok', 'data': {'id': msg.id}}), 201


@mentor_bp.route('/messages/<admission_number>', methods=['GET'])
@login_required
@role_required('mentor')
def get_messages(admission_number):
    mid  = _my_mentor_id()
    msgs = MentorMessage.query.filter_by(mentor_id=mid, student_id=admission_number).order_by(MentorMessage.sent_at.asc()).all()
    return jsonify({'status': 'ok', 'data': [{
        'id':          m.id,
        'message':     m.message,
        'sender_role': m.sender_role,
        'sent_at':     m.sent_at.isoformat() if m.sent_at else None,
        'is_read':     m.is_read,
    } for m in msgs]}), 200


# ═══════════════════════════════════════════════════════════════════
#  ALERTS
# ═══════════════════════════════════════════════════════════════════

@mentor_bp.route('/alerts', methods=['GET'])
@login_required
@role_required('mentor')
def get_alerts():
    mid      = _my_mentor_id()
    mentees  = Student.query.filter_by(mentor_id=mid).all()
    now      = datetime.utcnow()
    alerts   = []

    for s in mentees:
        reasons = []

        # Attendance < 75%
        att_rows = Attendance.query.filter_by(student_admission_number=s.admission_number).all()
        total    = sum(a.total_classes    for a in att_rows if a.total_classes)
        attended = sum(a.attended_classes for a in att_rows if a.attended_classes)
        if total and (attended / total * 100) < 75:
            reasons.append('Attendance below 75%')

        # Any internal < 35
        marks = StudentMark.query.filter_by(student_id=s.admission_number).all()
        for m in marks:
            for val in (m.internal1, m.internal2, m.internal3):
                if val is not None and val < 35:
                    reasons.append(f'Low mark ({val}) in {m.subject_code}')
                    break

        # Unresolved issue > 7 days
        old_issues = Issue.query.filter_by(student_id=s.admission_number, status='open').all()
        for i in old_issues:
            if i.raised_at and (now - i.raised_at).days > 7:
                reasons.append(f'Issue unresolved for {(now - i.raised_at).days} days')

        if reasons:
            alerts.append({
                'admission_number': s.admission_number,
                'name':             s.full_name,
                'risk_level':       calculate_risk_level(s.admission_number),
                'reasons':          reasons,
            })

    return jsonify({'status': 'ok', 'data': alerts}), 200


# ═══════════════════════════════════════════════════════════════════
#  INTERVENTIONS
# ═══════════════════════════════════════════════════════════════════

@mentor_bp.route('/interventions', methods=['POST'])
@login_required
@role_required('mentor')
def add_intervention():
    mid  = _my_mentor_id()
    data = request.get_json(force=True) or {}
    adm  = data.get('admission_number')
    if not adm:
        return jsonify({'status': 'error', 'message': 'admission_number required'}), 400

    intv = MentorIntervention(
        mentor_id=mid,
        student_id=adm,
        week_start=datetime.utcnow().date(),
        intervention_type=data.get('intervention_type'),
        notes=data.get('notes'),
        escalated=False,
    )
    db.session.add(intv)
    db.session.commit()

    # Auto-escalate if student had a prior intervention > 14 days ago with no improvement
    _auto_escalate_if_needed(mid, adm)

    return jsonify({'status': 'ok', 'data': {'id': intv.id}}), 201


def _auto_escalate_if_needed(mentor_id: int, adm_no: str):
    """If there's a prior intervention > 14 days old and still not resolved, escalate."""
    cutoff  = datetime.utcnow() - timedelta(days=14)
    old     = MentorIntervention.query.filter(
        MentorIntervention.mentor_id   == mentor_id,
        MentorIntervention.student_id  == adm_no,
        MentorIntervention.created_at  <= cutoff,
        MentorIntervention.escalated   == False,
    ).first()
    if old:
        old.escalated    = True
        old.escalated_at = datetime.utcnow()
        db.session.commit()
