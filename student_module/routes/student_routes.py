"""
routes/student_routes.py
All student self-service endpoints.  Returns JSON.
"""
import os
from datetime import datetime

from flask import Blueprint, request, jsonify, session, current_app
from werkzeug.utils import secure_filename

from models import (
    db, Student, Timetable, Notification, Appointment,
    Issue, LeaveRequest, Certificate, StudentMark, Attendance,
    Parent, Academic, Guardian, OtherInfo, WorkExperience,
)
from utils.decorators import login_required, role_required
from utils.ai           import generate_daily_goal, generate_study_plan

student_bp = Blueprint('student_routes', __name__, url_prefix='/student')

ALLOWED_CERT_MIMES = {'application/pdf', 'image/jpeg', 'image/png'}
MAX_FILE_SIZE      = 10 * 1024 * 1024


# ═══════════════════════════════════════════════════════════════════
#  PROFILE
# ═══════════════════════════════════════════════════════════════════

@student_bp.route('/profile/complete', methods=['POST'])
@login_required
@role_required('student')
def complete_profile():
    data  = request.get_json(force=True) or {}
    s_id  = session['user_id']
    s     = Student.query.get_or_404(s_id)

    missing = [sec for sec in ('personal', 'parent', 'academic') if sec not in data]
    if missing:
        return jsonify({'status': 'error', 'message': f"Missing sections: {', '.join(missing)}"}), 400

    try:
        personal = data['personal']
        parent   = data['parent']
        academic = data.get('academic', {})
        guardian = data.get('guardian', {})
        accom    = data.get('accommodation', {})
        work     = data.get('work_experience', {})

        # ── Student base fields ─────────────────────────────────────────────
        for attr, key in [
            ('dob',               'dob'),
            ('blood_group',       'blood_group'),
            ('religion',          'religion'),
            ('diocese',           'diocese'),
            ('parish',            'parish'),
            ('permanent_address', 'permanent_address'),
            ('contact_address',   'current_address'),
            ('mobile_number',     'mobile_number'),
        ]:
            if key in personal:
                setattr(s, attr, personal[key])

        if personal.get('same_address'):
            s.contact_address = s.permanent_address

        # ── Parent ──────────────────────────────────────────────────────────
        p = s.parents or Parent(student_admission_number=s_id)
        p.father_name          = parent.get('father_name', p.father_name)
        p.father_profession    = parent.get('father_profession', p.father_profession)
        p.father_age           = parent.get('father_age', p.father_age)
        p.father_place_of_work = parent.get('father_workplace', p.father_place_of_work)
        p.father_mobile        = parent.get('father_mobile', p.father_mobile)
        p.mother_name          = parent.get('mother_name', p.mother_name)
        p.mother_profession    = parent.get('mother_profession', p.mother_profession)
        p.mother_age           = parent.get('mother_age', p.mother_age)
        p.mother_place_of_work = parent.get('mother_workplace', p.mother_place_of_work)
        p.mother_mobile        = parent.get('mother_mobile', p.mother_mobile)
        if not s.parents:
            db.session.add(p)

        # ── Guardian ────────────────────────────────────────────────────────
        if guardian.get('has_guardian'):
            g = s.guardian or Guardian(student_admission_number=s_id)
            g.name          = guardian.get('guardian_name', g.name)
            g.address       = guardian.get('guardian_address', g.address)
            g.mobile_number = guardian.get('guardian_mobile', g.mobile_number)
            if not s.guardian:
                db.session.add(g)

        # ── Academics ───────────────────────────────────────────────────────
        ac = s.academics or Academic(student_admission_number=s_id)
        ac.school_10th         = academic.get('tenth_school', ac.school_10th)
        ac.board_10th          = academic.get('tenth_board', ac.board_10th)
        ac.percentage_10th     = academic.get('tenth_marks', ac.percentage_10th)
        ac.school_12th         = academic.get('twelfth_school', ac.school_12th)
        ac.board_12th          = academic.get('twelfth_board', ac.board_12th)
        ac.percentage_12th     = academic.get('twelfth_marks', ac.percentage_12th)
        ac.college_ug          = academic.get('ug_college', ac.college_ug)
        ac.university_ug       = academic.get('ug_university', ac.university_ug)
        ac.percentage_ug       = academic.get('ug_marks', ac.percentage_ug)
        ac.entrance_rank       = academic.get('keam_rank') or academic.get('lbs_rank', ac.entrance_rank)
        ac.nature_of_admission = academic.get('admission_nature', ac.nature_of_admission)
        ac.medium_of_instruction = academic.get('tenth_medium', ac.medium_of_instruction)
        if not s.academics:
            db.session.add(ac)

        # ── Accommodation / Other Info ───────────────────────────────────────
        oi = s.other_info or OtherInfo(student_admission_number=s_id)
        oi.accommodation_type = accom.get('type', oi.accommodation_type)
        oi.staying_with       = accom.get('staying_with', oi.staying_with)
        oi.hostel_name        = accom.get('hostel_name', oi.hostel_name)
        oi.transport_mode     = accom.get('conveyance_mode', oi.transport_mode)
        oi.vehicle_number     = accom.get('vehicle_number', oi.vehicle_number)
        if accom.get('from_date'):
            try:
                oi.stay_from = datetime.strptime(accom['from_date'], '%Y-%m-%d').date()
            except Exception:
                pass
        if accom.get('to_date'):
            try:
                oi.stay_to = datetime.strptime(accom['to_date'], '%Y-%m-%d').date()
            except Exception:
                pass
        if not s.other_info:
            db.session.add(oi)

        # ── Work Experience ─────────────────────────────────────────────────
        if work.get('has_experience'):
            we = WorkExperience(
                student_admission_number=s_id,
                organization=work.get('org_name'),
                job_title=work.get('job_title'),
                duration=work.get('duration'),
            )
            db.session.add(we)

        s.profile_completed = True
        db.session.commit()
        return jsonify({'status': 'ok', 'message': 'Profile completed.'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@student_bp.route('/profile', methods=['GET'])
@login_required
@role_required('student')
def get_profile():
    s  = Student.query.get_or_404(session['user_id'])
    p  = s.parents
    ac = s.academics
    oi = s.other_info
    g  = s.guardian
    return jsonify({'status': 'ok', 'data': {
        'admission_number':  s.admission_number,
        'full_name':         s.full_name,
        'email':             s.email,
        'branch':            s.branch,
        'batch':             s.batch,
        'status':            s.status,
        'profile_completed': s.profile_completed,
        'blood_group':       s.blood_group,
        'religion':          s.religion,
        'permanent_address': s.permanent_address,
        'mentor_name':       s.mentor.name if s.mentor else None,
        'parent': {
            'father_name':   p.father_name if p else None,
            'father_mobile': p.father_mobile if p else None,
            'mother_name':   p.mother_name if p else None,
            'mother_mobile': p.mother_mobile if p else None,
        } if p else None,
        'academics': {
            'percentage_10th': ac.percentage_10th if ac else None,
            'percentage_12th': ac.percentage_12th if ac else None,
            'percentage_ug':   ac.percentage_ug if ac else None,
            'sgpa': ac.sgpa if ac else None,
            'cgpa': ac.cgpa if ac else None,
        } if ac else None,
        'accommodation': {
            'type':           oi.accommodation_type if oi else None,
            'hostel_name':    oi.hostel_name if oi else None,
            'transport_mode': oi.transport_mode if oi else None,
        } if oi else None,
        'guardian': {
            'name':    g.name if g else None,
            'mobile':  g.mobile_number if g else None,
            'address': g.address if g else None,
        } if g else None,
    }}), 200


# ═══════════════════════════════════════════════════════════════════
#  DASHBOARD
# ═══════════════════════════════════════════════════════════════════

@student_bp.route('/dashboard/summary', methods=['GET'])
@login_required
@role_required('student')
def get_dashboard_summary():
    s_id = session['user_id']
    s    = Student.query.get_or_404(s_id)

    # Attendance
    att_rows    = Attendance.query.filter_by(student_admission_number=s_id).all()
    total_cls   = sum(a.total_classes    for a in att_rows if a.total_classes)
    attended    = sum(a.attended_classes for a in att_rows if a.attended_classes)
    att_percent = round((attended / total_cls) * 100, 1) if total_cls else 0.0

    # Marks summary
    marks          = StudentMark.query.filter_by(student_id=s_id).all()
    latest_marks   = {m.subject_code: m.internal1 for m in marks if m.internal1 is not None}
    weak_subjects  = [m.subject_code for m in marks if m.internal1 is not None and m.internal1 < 40]

    # Notifications
    unread_count = Notification.query.filter_by(student_id=s_id, is_read=False).count()

    ai_goal = generate_daily_goal(s.full_name, s.branch or '', 'current', weak_subjects, latest_marks)

    return jsonify({'status': 'ok', 'data': {
        'name':                     s.full_name,
        'admission_number':         s.admission_number,
        'branch':                   s.branch,
        'batch':                    s.batch,
        'mentor_name':              s.mentor.name if s.mentor else None,
        'attendance_percent':       att_percent,
        'unread_notifications_count': unread_count,
        'pending_assignments_count': 0,  # extend when assignment model added
        'ai_goal_of_the_day':       ai_goal,
    }}), 200


# ═══════════════════════════════════════════════════════════════════
#  ATTENDANCE
# ═══════════════════════════════════════════════════════════════════

@student_bp.route('/attendance', methods=['GET'])
@login_required
@role_required('student')
def get_attendance():
    s_id = session['user_id']
    rows = Attendance.query.filter_by(student_admission_number=s_id).all()
    result = [{
        'subject_name':    a.subject_name,
        'subject_code':    a.subject_code,
        'semester':        a.semester,
        'total_classes':   a.total_classes,
        'attended_classes': a.attended_classes,
        'percentage':      a.percentage,
    } for a in rows]
    return jsonify({'status': 'ok', 'data': result}), 200


# ═══════════════════════════════════════════════════════════════════
#  MARKS
# ═══════════════════════════════════════════════════════════════════

@student_bp.route('/marks', methods=['GET'])
@login_required
@role_required('student')
def get_marks():
    s_id  = session['user_id']
    marks = StudentMark.query.filter_by(student_id=s_id).all()

    subjects = []
    semester_totals: dict = {}

    for m in marks:
        internals = [v for v in (m.internal1, m.internal2, m.internal3) if v is not None]
        avg_internal = sum(internals) / len(internals) if internals else None
        subjects.append({
            'subject_code':   m.subject_code,
            'semester':       m.semester,
            'internal1':      m.internal1,
            'internal2':      m.internal2,
            'internal3':      m.internal3,
            'university_mark': m.university_mark,
            'avg_internal':   round(avg_internal, 2) if avg_internal else None,
        })
        if m.semester and avg_internal is not None:
            semester_totals.setdefault(m.semester, []).append(avg_internal)

    weak = [s for s in subjects if s['internal1'] is not None and s['internal1'] < 40]

    sem_comparison = [
        {'semester': sem, 'average': round(sum(vals) / len(vals), 2)}
        for sem, vals in sorted(semester_totals.items())
    ]

    return jsonify({'status': 'ok', 'data': {
        'subjects':           subjects,
        'semester_comparison': sem_comparison,
        'weak_subjects':      weak,
    }}), 200


# ═══════════════════════════════════════════════════════════════════
#  TIMETABLE
# ═══════════════════════════════════════════════════════════════════

@student_bp.route('/timetable', methods=['GET'])
@login_required
@role_required('student')
def get_timetable():
    s  = Student.query.get_or_404(session['user_id'])
    tt = Timetable.query.filter_by(batch_id=s.batch_id).order_by(Timetable.uploaded_at.desc()).first()
    if not tt:
        return jsonify({'status': 'ok', 'data': {}}), 200
    return jsonify({'status': 'ok', 'data': {
        'timetable_id':  tt.id,
        'semester':      tt.semester,
        'academic_year': tt.academic_year,
        'download_url':  f'/{tt.file_path}' if tt.file_path else None,
        'uploaded_at':   tt.uploaded_at.isoformat() if tt.uploaded_at else None,
    }}), 200


# ═══════════════════════════════════════════════════════════════════
#  NOTIFICATIONS
# ═══════════════════════════════════════════════════════════════════

@student_bp.route('/notifications', methods=['GET'])
@login_required
@role_required('student')
def get_notifications():
    s_id   = session['user_id']
    notifs = Notification.query.filter_by(student_id=s_id).order_by(Notification.created_at.desc()).all()
    return jsonify({'status': 'ok', 'data': [{
        'id':       n.id,
        'title':    n.title,
        'message':  n.message,
        'type':     n.type,
        'is_read':  n.is_read,
        'created_at': n.created_at.isoformat() if n.created_at else None,
    } for n in notifs]}), 200


@student_bp.route('/notifications/<int:n_id>/read', methods=['PATCH'])
@login_required
@role_required('student')
def mark_notification_read(n_id):
    n = Notification.query.filter_by(id=n_id, student_id=session['user_id']).first_or_404()
    n.is_read = True
    db.session.commit()
    return jsonify({'status': 'ok', 'message': 'Marked as read.'}), 200


# ═══════════════════════════════════════════════════════════════════
#  AI STUDY PLAN
# ═══════════════════════════════════════════════════════════════════

@student_bp.route('/study-plan', methods=['GET'])
@login_required
@role_required('student')
def get_study_plan():
    s_id         = session['user_id']
    marks        = StudentMark.query.filter_by(student_id=s_id).all()
    subject_data = {m.subject_code: m.internal1 for m in marks if m.internal1 is not None}
    plan         = generate_study_plan(3, subject_data, '18:00', '17:00')
    return jsonify({'status': 'ok', 'data': plan}), 200


# ═══════════════════════════════════════════════════════════════════
#  APPOINTMENTS
# ═══════════════════════════════════════════════════════════════════

@student_bp.route('/appointments/book', methods=['POST'])
@login_required
@role_required('student')
def book_appointment():
    s_id = session['user_id']
    s    = Student.query.get_or_404(s_id)
    if not s.mentor_id:
        return jsonify({'status': 'error', 'message': 'No mentor assigned yet.'}), 400

    data = request.get_json(force=True) or {}
    try:
        pref_date = datetime.strptime(data['preferred_date'], '%Y-%m-%d').date()
        pref_time = datetime.strptime(data['preferred_time'], '%H:%M').time()
    except Exception:
        return jsonify({'status': 'error', 'message': 'Invalid date/time format. Use YYYY-MM-DD and HH:MM'}), 400

    appt = Appointment(
        student_id=s_id, mentor_id=s.mentor_id,
        preferred_date=pref_date, preferred_time=pref_time,
        mode=data.get('mode', 'offline'),
        notes=data.get('notes', ''),
        status='pending',
    )
    db.session.add(appt)
    # Notify mentor (via Notification if mentor has student side; optional)
    db.session.commit()
    return jsonify({'status': 'ok', 'message': 'Appointment booked.', 'data': {'id': appt.id}}), 201


@student_bp.route('/appointments', methods=['GET'])
@login_required
@role_required('student')
def get_appointments():
    appts = Appointment.query.filter_by(student_id=session['user_id']).all()
    return jsonify({'status': 'ok', 'data': [{
        'id':             a.id,
        'preferred_date': str(a.preferred_date),
        'preferred_time': str(a.preferred_time),
        'mode':           a.mode,
        'status':         a.status,
        'meeting_link':   a.meeting_link,
        'notes':          a.notes,
    } for a in appts]}), 200


# ═══════════════════════════════════════════════════════════════════
#  ISSUES
# ═══════════════════════════════════════════════════════════════════

@student_bp.route('/issues/raise', methods=['POST'])
@login_required
@role_required('student')
def raise_issue():
    s_id = session['user_id']
    s    = Student.query.get_or_404(s_id)
    data = request.get_json(force=True) or {}
    issue = Issue(
        student_id=s_id, mentor_id=s.mentor_id,
        category=data.get('category'),
        subject=data.get('subject'),
        description=data.get('description'),
        status='open',
    )
    db.session.add(issue)
    db.session.commit()
    return jsonify({'status': 'ok', 'message': 'Issue raised.', 'data': {'id': issue.id}}), 201


@student_bp.route('/issues', methods=['GET'])
@login_required
@role_required('student')
def get_issues():
    issues = Issue.query.filter_by(student_id=session['user_id']).all()
    return jsonify({'status': 'ok', 'data': [{
        'id':          i.id,
        'category':    i.category,
        'subject':     i.subject,
        'status':      i.status,
        'raised_at':   i.raised_at.isoformat() if i.raised_at else None,
        'resolution':  i.resolution_notes,
    } for i in issues]}), 200


# ═══════════════════════════════════════════════════════════════════
#  LEAVE REQUESTS
# ═══════════════════════════════════════════════════════════════════

@student_bp.route('/leave/request', methods=['POST'])
@login_required
@role_required('student')
def request_leave():
    s_id = session['user_id']
    data = request.get_json(force=True) or {}
    try:
        from_d = datetime.strptime(data['from_date'], '%Y-%m-%d').date()
        to_d   = datetime.strptime(data['to_date'], '%Y-%m-%d').date() if data.get('to_date') else from_d
    except Exception:
        return jsonify({'status': 'error', 'message': 'Invalid date format. Use YYYY-MM-DD'}), 400

    lr = LeaveRequest(
        student_admission_number=s_id,
        type=data.get('type'),
        from_date=from_d,
        to_date=to_d,
        reason=data.get('reason'),
        document_path=data.get('document_url'),
        status='pending',
    )
    db.session.add(lr)
    db.session.commit()
    return jsonify({'status': 'ok', 'message': 'Leave request submitted.', 'data': {'id': lr.id}}), 201


# ═══════════════════════════════════════════════════════════════════
#  CERTIFICATES
# ═══════════════════════════════════════════════════════════════════

@student_bp.route('/certificates/upload', methods=['POST'])
@login_required
@role_required('student')
def upload_certificate():
    s_id = session['user_id']
    if 'file' not in request.files:
        return jsonify({'status': 'error', 'message': 'No file'}), 400

    file = request.files['file']
    if file.content_length and file.content_length > MAX_FILE_SIZE:
        return jsonify({'status': 'error', 'message': 'File exceeds 10 MB limit'}), 400
    if file.mimetype not in ALLOWED_CERT_MIMES:
        return jsonify({'status': 'error', 'message': 'Invalid file type. Allowed: PDF, JPG, PNG'}), 400

    date_str = request.form.get('date_of_event')
    try:
        doe = datetime.strptime(date_str, '%Y-%m-%d').date() if date_str else None
    except Exception:
        doe = None

    # Save file
    filename = secure_filename(file.filename)
    save_dir = os.path.join(current_app.root_path, 'static', 'uploads', 'certificates', s_id)
    os.makedirs(save_dir, exist_ok=True)
    save_path = os.path.join(save_dir, filename)
    file.save(save_path)
    rel_path  = os.path.relpath(save_path, current_app.root_path).replace('\\', '/')

    cert = Certificate(
        student_id=s_id,
        activity_name=request.form.get('activity_name'),
        category=request.form.get('category'),
        date_of_event=doe,
        file_path=rel_path,
    )
    db.session.add(cert)
    db.session.commit()
    return jsonify({'status': 'ok', 'data': {'id': cert.id, 'download_url': f'/{rel_path}'}}), 201


@student_bp.route('/certificates', methods=['GET'])
@login_required
@role_required('student')
def get_certificates():
    certs = Certificate.query.filter_by(student_id=session['user_id']).all()
    return jsonify({'status': 'ok', 'data': [{
        'id':            c.id,
        'activity_name': c.activity_name,
        'category':      c.category,
        'date_of_event': str(c.date_of_event) if c.date_of_event else None,
        'download_url':  f'/{c.file_path}' if c.file_path else None,
        'uploaded_at':   c.uploaded_at.isoformat() if c.uploaded_at else None,
    } for c in certs]}), 200
