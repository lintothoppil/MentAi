"""
routes/hod_routes.py
All HOD-only endpoints. Returns JSON.
"""
from datetime import datetime

from flask import Blueprint, request, jsonify, session

from models import db, Student, Faculty, Attendance, StudentMark, Issue, LeaveRequest, MentorIntervention
from utils.decorators  import login_required, role_required
from utils.risk_engine import calculate_risk_level

hod_bp = Blueprint('hod_routes', __name__, url_prefix='/hod')


def _my_hod_faculty():
    return Faculty.query.get(session.get('user_id'))


# ═══════════════════════════════════════════════════════════════════
#  DEPARTMENT OVERVIEW
# ═══════════════════════════════════════════════════════════════════

@hod_bp.route('/department/overview', methods=['GET'])
@login_required
@role_required('hod')
def get_dept_overview():
    f    = _my_hod_faculty()
    dept = f.department if f else ''

    students = Student.query.filter_by(branch=dept, status='Live').all()
    mentors  = Faculty.query.filter_by(department=dept, is_mentor_eligible=True, status='Live').all()

    # Average attendance
    total_att = 0
    total_cls = 0
    for s in students:
        rows = Attendance.query.filter_by(student_admission_number=s.admission_number).all()
        total_cls += sum(a.total_classes    for a in rows if a.total_classes)
        total_att += sum(a.attended_classes for a in rows if a.attended_classes)
    avg_attendance = round((total_att / total_cls) * 100, 1) if total_cls else 0.0

    # Average marks
    marks = StudentMark.query.filter(
        StudentMark.student_id.in_([s.admission_number for s in students])
    ).all()
    vals = [m.internal1 for m in marks if m.internal1 is not None]
    avg_marks = round(sum(vals) / len(vals), 2) if vals else 0.0

    # At-risk count
    at_risk = sum(1 for s in students if calculate_risk_level(s.admission_number) != 'low')

    open_issues = Issue.query.filter(
        Issue.student_id.in_([s.admission_number for s in students]),
        Issue.status == 'open'
    ).count()

    return jsonify({'status': 'ok', 'data': {
        'department':      dept,
        'total_students':  len(students),
        'total_mentors':   len(mentors),
        'at_risk_count':   at_risk,
        'avg_attendance':  avg_attendance,
        'avg_marks':       avg_marks,
        'open_issues':     open_issues,
    }}), 200


# ═══════════════════════════════════════════════════════════════════
#  STUDENTS (read-only)
# ═══════════════════════════════════════════════════════════════════

@hod_bp.route('/students', methods=['GET'])
@login_required
@role_required('hod')
def get_students():
    f        = _my_hod_faculty()
    students = Student.query.filter_by(branch=f.department, status='Live').all() if f else []
    return jsonify({'status': 'ok', 'data': [{
        'admission_number': s.admission_number,
        'name':             s.full_name,
        'email':            s.email,
        'batch':            s.batch,
        'profile_completed': s.profile_completed,
        'risk_level':       calculate_risk_level(s.admission_number),
        'mentor_name':      s.mentor.name if s.mentor else None,
    } for s in students]}), 200


# ═══════════════════════════════════════════════════════════════════
#  MENTORS
# ═══════════════════════════════════════════════════════════════════

@hod_bp.route('/mentors', methods=['GET'])
@login_required
@role_required('hod')
def get_mentors():
    f       = _my_hod_faculty()
    mentors = Faculty.query.filter_by(
        department=f.department,
        is_mentor_eligible=True,
        status='Live',
    ).all() if f else []
    return jsonify({'status': 'ok', 'data': [{
        'faculty_id':   m.username,
        'name':         m.name,
        'email':        m.email,
        'designation':  m.designation,
        'mentee_count': len(m.mentees) if m.mentees else 0,
    } for m in mentors]}), 200


# ═══════════════════════════════════════════════════════════════════
#  ESCALATIONS
# ═══════════════════════════════════════════════════════════════════

@hod_bp.route('/escalations', methods=['GET'])
@login_required
@role_required('hod')
def get_escalations():
    f    = _my_hod_faculty()
    dept = f.department if f else ''

    dept_students = [s.admission_number for s in Student.query.filter_by(branch=dept).all()]

    escalated_issues = Issue.query.filter(
        Issue.student_id.in_(dept_students),
        Issue.status == 'escalated',
    ).all()

    escalated_interventions = MentorIntervention.query.filter(
        MentorIntervention.student_id.in_(dept_students),
        MentorIntervention.escalated == True,
    ).all()

    return jsonify({'status': 'ok', 'data': {
        'issues': [{
            'id':          i.id,
            'student_id':  i.student_id,
            'category':    i.category,
            'subject':     i.subject,
            'description': i.description,
            'raised_at':   i.raised_at.isoformat() if i.raised_at else None,
        } for i in escalated_issues],
        'interventions': [{
            'id':                x.id,
            'student_id':        x.student_id,
            'intervention_type': x.intervention_type,
            'notes':             x.notes,
            'escalated_at':      x.escalated_at.isoformat() if x.escalated_at else None,
        } for x in escalated_interventions],
    }}), 200


@hod_bp.route('/escalations/<int:e_id>', methods=['PATCH'])
@login_required
@role_required('hod')
def update_escalation(e_id):
    i    = Issue.query.get_or_404(e_id)
    data = request.get_json(force=True) or {}
    if 'status'           in data: i.status           = data['status']
    if 'resolution_notes' in data: i.resolution_notes = data['resolution_notes']
    if data.get('status') == 'closed':
        i.resolved_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'status': 'ok', 'message': 'Updated.'}), 200


# ═══════════════════════════════════════════════════════════════════
#  DEPARTMENT-WIDE ALERTS
# ═══════════════════════════════════════════════════════════════════

@hod_bp.route('/alerts', methods=['GET'])
@login_required
@role_required('hod')
def get_alerts():
    f    = _my_hod_faculty()
    dept = f.department if f else ''

    students = Student.query.filter_by(branch=dept, status='Live').all()
    alerts   = []
    for s in students:
        risk = calculate_risk_level(s.admission_number)
        if risk != 'low':
            alerts.append({
                'admission_number': s.admission_number,
                'name':             s.full_name,
                'risk_level':       risk,
                'mentor_name':      s.mentor.name if s.mentor else None,
            })
    return jsonify({'status': 'ok', 'data': alerts}), 200


# ═══════════════════════════════════════════════════════════════════
#  LEAVE REQUESTS
# ═══════════════════════════════════════════════════════════════════

@hod_bp.route('/leaves/pending', methods=['GET'])
@login_required
@role_required('hod')
def get_pending_leaves():
    f    = _my_hod_faculty()
    dept = f.department if f else ''

    dept_students = [s.admission_number for s in Student.query.filter_by(branch=dept).all()]
    leaves = LeaveRequest.query.filter(
        LeaveRequest.student_admission_number.in_(dept_students),
        LeaveRequest.status == 'pending',
    ).all()

    return jsonify({'status': 'ok', 'data': [{
        'id':           l.id,
        'student_id':   l.student_admission_number,
        'type':         l.type,
        'from_date':    str(l.from_date) if l.from_date else None,
        'to_date':      str(l.to_date)   if l.to_date   else None,
        'reason':       l.reason,
        'status':       l.status,
    } for l in leaves]}), 200


@hod_bp.route('/leaves/<int:l_id>', methods=['PATCH'])
@login_required
@role_required('hod')
def update_leave(l_id):
    l    = LeaveRequest.query.get_or_404(l_id)
    data = request.get_json(force=True) or {}
    if 'status'  in data: l.status = data['status']
    if 'remarks' in data: l.reason = data['remarks']  # store remarks as reason
    db.session.commit()
    return jsonify({'status': 'ok', 'message': f'Leave {l.status}.'}), 200
