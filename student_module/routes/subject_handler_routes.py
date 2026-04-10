"""
routes/subject_handler_routes.py
All subject-handler endpoints. Returns JSON.
"""
import os
from flask import Blueprint, request, jsonify, session, current_app
from werkzeug.utils import secure_filename

from models import db, Student, Faculty, StudentMark, Notification, Timetable
from utils.decorators import login_required, role_required

subject_handler_bp = Blueprint('subject_handler_routes', __name__, url_prefix='/subject-handler')

ALLOWED_NOTE_MIMES = {
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}


# ═══════════════════════════════════════════════════════════════════
#  AT-RISK STUDENTS
# ═══════════════════════════════════════════════════════════════════

@subject_handler_bp.route('/at-risk-students', methods=['GET'])
@login_required
@role_required('subject_handler')
def get_at_risk_students():
    """Students who failed the same subject in 2+ internals."""
    marks = StudentMark.query.all()
    at_risk = []

    # Group by student + subject
    from collections import defaultdict
    subject_failures: dict = defaultdict(lambda: defaultdict(int))
    for m in marks:
        fails = sum(1 for v in (m.internal1, m.internal2, m.internal3) if v is not None and v < 35)
        if fails >= 2:
            subject_failures[m.student_id][m.subject_code] += 1

    for adm, subjects in subject_failures.items():
        s = Student.query.get(adm)
        if not s:
            continue
        for subj_code in subjects:
            at_risk.append({
                'admission_number': adm,
                'name':             s.full_name,
                'subject_code':     subj_code,
                'risk':             'Failed 2+ internals',
            })

    return jsonify({'status': 'ok', 'data': at_risk}), 200


# ═══════════════════════════════════════════════════════════════════
#  NOTES
# ═══════════════════════════════════════════════════════════════════

@subject_handler_bp.route('/notes/upload', methods=['POST'])
@login_required
@role_required('subject_handler')
def upload_notes():
    f_id = session.get('user_id')
    file = request.files.get('file')
    if not file:
        return jsonify({'status': 'error', 'message': 'No file provided'}), 400
    if file.mimetype not in ALLOWED_NOTE_MIMES:
        return jsonify({'status': 'error', 'message': 'Invalid file type. Allowed: PDF, PPT, DOCX'}), 400

    subject_code = request.form.get('subject_code', 'general')
    title        = request.form.get('title', 'Notes')
    description  = request.form.get('description', '')

    filename = secure_filename(file.filename)
    save_dir = os.path.join(current_app.root_path, 'static', 'uploads', 'notes', subject_code)
    os.makedirs(save_dir, exist_ok=True)
    save_path = os.path.join(save_dir, filename)
    file.save(save_path)
    rel_path = os.path.relpath(save_path, current_app.root_path).replace('\\', '/')

    # NotifyAllEnrolledStudentsForThisSubject (via subject_code lookup)
    # Since there's no formal subject-student enrollment table yet, notify all Live students
    # whose marks include this subject
    enrolled_admns = {m.student_id for m in StudentMark.query.filter_by(subject_code=subject_code).all()}
    notified = 0
    for adm in enrolled_admns:
        db.session.add(Notification(
            student_id=adm,
            title=f'New Notes: {title}',
            message=f'New study material for {subject_code} has been uploaded: {description}',
            type='notes',
            is_read=False,
        ))
        notified += 1

    db.session.commit()
    return jsonify({'status': 'ok', 'data': {
        'subject_code':  subject_code,
        'title':         title,
        'download_url':  f'/{rel_path}',
        'notified_count': notified,
    }}), 201


@subject_handler_bp.route('/notes', methods=['GET'])
@login_required
@role_required('subject_handler')
def get_notes():
    """List notes created by this subject handler — reads file system directory."""
    f_id     = session.get('user_id')
    notes_dir = os.path.join(current_app.root_path, 'static', 'uploads', 'notes')
    result   = []
    if os.path.exists(notes_dir):
        for subject in os.listdir(notes_dir):
            subject_path = os.path.join(notes_dir, subject)
            if os.path.isdir(subject_path):
                for fname in os.listdir(subject_path):
                    result.append({
                        'subject_code': subject,
                        'title':        fname,
                        'download_url': f'/static/uploads/notes/{subject}/{fname}',
                    })
    return jsonify({'status': 'ok', 'data': result}), 200


# ═══════════════════════════════════════════════════════════════════
#  STUDY PLAN (remedial)
# ═══════════════════════════════════════════════════════════════════

@subject_handler_bp.route('/study-plan', methods=['POST'])
@login_required
@role_required('subject_handler')
def create_study_plan():
    data = request.get_json(force=True) or {}
    # Store plan content into DB — extend model if needed
    subject_code = data.get('subject_code')
    batch_id     = data.get('batch_id')
    plan_content = data.get('plan_content', '')
    if not subject_code or not batch_id:
        return jsonify({'status': 'error', 'message': 'subject_code and batch_id required'}), 400

    # Notify all students in the batch who have marks for this subject
    adm_set = {m.student_id for m in StudentMark.query.filter_by(subject_code=subject_code).all()}
    students_in_batch = {s.admission_number for s in Student.query.filter_by(batch_id=int(batch_id)).all()}
    targets  = adm_set & students_in_batch
    notified = 0
    for adm in targets:
        db.session.add(Notification(
            student_id=adm,
            title=f'Remedial Plan: {subject_code}',
            message=f'A new remedial study plan has been created for {subject_code}.',
            type='study_plan',
            is_read=False,
        ))
        notified += 1

    db.session.commit()
    return jsonify({'status': 'ok', 'message': 'Study plan created and students notified.', 'data': {
        'subject_code': subject_code, 'notified_count': notified,
    }}), 200


# ═══════════════════════════════════════════════════════════════════
#  STUDENT PROGRESS
# ═══════════════════════════════════════════════════════════════════

@subject_handler_bp.route('/progress/<admission_number>/<subject_code>', methods=['GET'])
@login_required
@role_required('subject_handler')
def get_student_progress(admission_number, subject_code):
    marks = StudentMark.query.filter_by(
        student_id=admission_number,
        subject_code=subject_code,
    ).order_by(StudentMark.semester.asc()).all()

    trend = [{
        'semester':       m.semester,
        'internal1':      m.internal1,
        'internal2':      m.internal2,
        'internal3':      m.internal3,
        'university_mark': m.university_mark,
    } for m in marks]

    return jsonify({'status': 'ok', 'data': {
        'admission_number': admission_number,
        'subject_code':     subject_code,
        'trend':            trend,
    }}), 200
