"""
routes/admin_routes.py
All admin-only endpoints.  Returns JSON.
"""
import os
import csv
from io import StringIO
from datetime import datetime

from flask import Blueprint, request, jsonify, session, current_app
from werkzeug.utils import secure_filename

from models import (
    db, Student, Faculty, Batch, Course, Timetable,
    Notification, AlumniStudent, Parent, Academic, Guardian, OtherInfo, WorkExperience
)
from utils.decorators import login_required, role_required
from utils.validators  import parse_admission_number, validate_admission_format
from services.bulk_upload     import bulk_upload_faculty
from services.mentor_allocation import preview_allocation, confirm_allocation
from services.batch_service   import promote_expired_batches_to_alumni

admin_bp = Blueprint('admin_routes', __name__, url_prefix='/admin')

ALLOWED_TIMETABLE_MIMES = {
    'application/pdf',
    'image/jpeg', 'image/png',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


# ═══════════════════════════════════════════════════════════════════
#  STUDENT MANAGEMENT
# ═══════════════════════════════════════════════════════════════════

@admin_bp.route('/students/bulk-upload', methods=['POST'])
@login_required
@role_required('admin')
def upload_students():
    if 'file' not in request.files:
        return jsonify({'status': 'error', 'message': 'No file provided'}), 400
    file = request.files['file']
    if not file.filename:
        return jsonify({'status': 'error', 'message': 'Empty filename'}), 400

    stream   = StringIO(file.stream.read().decode('utf-8', errors='replace'), newline=None)
    rows     = list(csv.DictReader(stream))
    total    = len(rows)
    success  = 0
    failed   = []

    for i, row in enumerate(rows, start=2):
        adm_no = row.get('admission_number', '').strip().upper()

        if not validate_admission_format(adm_no):
            failed.append({'row': i, 'admission_number': adm_no, 'reason': 'Invalid format (expected A##CODE###)'})
            continue

        if Student.query.get(adm_no):
            failed.append({'row': i, 'admission_number': adm_no, 'reason': 'Duplicate'})
            continue

        parsed = parse_admission_number(adm_no)
        s = Student(
            admission_number=adm_no,
            full_name=row.get('full_name', '').strip(),
            email=row.get('email', '').strip(),
            password_hash=None,
            status='Pending',
            profile_completed=False,
            branch=parsed['dept_code'],
            batch=str(parsed['batch_year']),
        )
        db.session.add(s)
        success += 1

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500

    return jsonify({
        'status': 'ok',
        'data': {'total': total, 'success': success, 'failed': failed},
    }), 200


@admin_bp.route('/students/grouped', methods=['GET'])
@login_required
@role_required('admin')
def get_grouped_students():
    students = Student.query.filter(Student.status.in_(['Live', 'Pending'])).all()
    depts: dict = {}

    for s in students:
        if not s.batch_id:
            continue
        b = Batch.query.get(s.batch_id)
        if not b or not b.course:
            continue

        dept_name   = s.branch or 'Unknown'
        course_name = b.course.name
        course_id   = b.course.id
        batch_label = f"{course_name} {b.start_year}-{b.end_year}"

        depts.setdefault(dept_name, {})
        depts[dept_name].setdefault(course_name, {'id': course_id, 'batches': {}})
        bdict = depts[dept_name][course_name]['batches']
        bdict.setdefault(batch_label, {
            'batch_id': b.id, 'start_year': b.start_year, 'end_year': b.end_year,
            'status': b.status, 'count': 0, 'students': [],
        })
        bdict[batch_label]['count'] += 1
        bdict[batch_label]['students'].append({
            'admission_number': s.admission_number,
            'full_name':        s.full_name,
            'email':            s.email,
            'status':           s.status,
            'profile_completed': s.profile_completed,
            'mentor_name':      s.mentor.name if s.mentor else None,
        })

    result = []
    for d, courses in depts.items():
        c_list = []
        for c, cdata in courses.items():
            b_list = [{'label': k, **{kk: vv for kk, vv in v.items()}}
                      for k, v in cdata['batches'].items()]
            c_list.append({'name': c, 'course_id': cdata['id'], 'batches': b_list})
        result.append({'name': d, 'code': d, 'courses': c_list})

    return jsonify({'status': 'ok', 'data': {'departments': result}}), 200


@admin_bp.route('/students/alumni', methods=['GET'])
@login_required
@role_required('admin')
def get_alumni():
    alumni = AlumniStudent.query.all()
    result = [
        {
            'admission_number': a.admission_number,
            'name':             a.name,
            'email':            a.email,
            'department':       a.department,
            'passout_year':     a.passout_year,
        }
        for a in alumni
    ]
    return jsonify({'status': 'ok', 'data': result}), 200


@admin_bp.route('/students/<admission_number>', methods=['GET'])
@login_required
@role_required('admin')
def get_student(admission_number):
    s = Student.query.get_or_404(admission_number)
    p = s.parents
    a = s.academics
    return jsonify({'status': 'ok', 'data': {
        'admission_number': s.admission_number,
        'full_name':        s.full_name,
        'email':            s.email,
        'branch':           s.branch,
        'batch':            s.batch,
        'status':           s.status,
        'profile_completed': s.profile_completed,
        'mentor_id':        s.mentor_id,
        'mentor_name':      s.mentor.name if s.mentor else None,
        'parents':          {'father': p.father_name if p else None, 'mother': p.mother_name if p else None},
        'academics':        {'sgpa': a.sgpa if a else None, 'cgpa': a.cgpa if a else None},
    }}), 200


@admin_bp.route('/students/<admission_number>', methods=['PATCH'])
@login_required
@role_required('admin')
def update_student(admission_number):
    s    = Student.query.get_or_404(admission_number)
    data = request.get_json(force=True) or {}
    if 'status'                in data: s.status                = data['status']
    if 'mentor_id'             in data: s.mentor_id             = data['mentor_id']
    if 'registration_approved' in data: s.profile_completed     = data['registration_approved']
    db.session.commit()
    return jsonify({'status': 'ok', 'message': 'Updated.'}), 200


@admin_bp.route('/students/<admission_number>/reset-password', methods=['POST'])
@login_required
@role_required('admin')
def reset_student_password(admission_number):
    s = Student.query.get_or_404(admission_number)
    s.password_hash = None
    cred = getattr(s, 'login_credential', None)
    if cred:
        db.session.delete(cred)
    db.session.commit()
    return jsonify({'status': 'ok', 'message': 'Password reset. Student must set new password on login.'}), 200


# ═══════════════════════════════════════════════════════════════════
#  FACULTY MANAGEMENT
# ═══════════════════════════════════════════════════════════════════

@admin_bp.route('/faculty/bulk-upload', methods=['POST'])
@login_required
@role_required('admin')
def upload_faculty():
    if 'file' not in request.files:
        return jsonify({'status': 'error', 'message': 'No file'}), 400
    file   = request.files['file']
    stream = StringIO(file.stream.read().decode('utf-8', errors='replace'), newline=None)
    rows   = list(csv.DictReader(stream))
    result = bulk_upload_faculty(rows)
    return jsonify({'status': 'ok', 'data': result}), 200


@admin_bp.route('/faculty/grouped', methods=['GET'])
@login_required
@role_required('admin')
def get_grouped_faculty():
    faculty  = Faculty.query.all()
    depts: dict = {}
    for f in faculty:
        depts.setdefault(f.department, {'name': f.department, 'hod': None, 'faculty': []})
        if f.is_hod:
            depts[f.department]['hod'] = {'name': f.name, 'faculty_id': f.username, 'email': f.email}
        depts[f.department]['faculty'].append({
            'faculty_id':         f.username,
            'name':               f.name,
            'email':              f.email,
            'designation':        f.designation,
            'status':             f.status,
            'is_mentor_eligible': f.is_mentor_eligible,
            'is_hod':             f.is_hod,
            'is_subject_handler': f.is_subject_handler,
            'mentee_count':       len(f.mentees) if f.mentees else 0,
        })
    return jsonify({'status': 'ok', 'data': {'departments': list(depts.values())}}), 200


@admin_bp.route('/faculty/<faculty_id>', methods=['PATCH'])
@login_required
@role_required('admin')
def update_faculty(faculty_id):
    f    = Faculty.query.filter_by(username=faculty_id).first_or_404()
    data = request.get_json(force=True) or {}
    for field in ('name', 'email', 'designation', 'status', 'is_hod', 'is_subject_handler'):
        if field in data:
            setattr(f, field, data[field])
    # Recalculate mentor eligibility
    f.is_mentor_eligible = (
        f.status == 'Live' and
        f.designation not in ('HOD', 'Lab Assistant', 'Admin') and
        f.department not in ('BSH', 'Basic Science and Humanities', 'Basic Sciences & Humanities') and
        not f.is_hod
    )
    db.session.commit()
    return jsonify({'status': 'ok', 'data': {
        'faculty_id': f.username, 'name': f.name, 'is_mentor_eligible': f.is_mentor_eligible,
    }}), 200


@admin_bp.route('/faculty/<faculty_id>/reset-password', methods=['POST'])
@login_required
@role_required('admin')
def reset_faculty_password(faculty_id):
    f = Faculty.query.filter_by(username=faculty_id).first_or_404()
    f.password_hash = None
    db.session.commit()
    return jsonify({'status': 'ok', 'message': 'Password reset.'}), 200


@admin_bp.route('/faculty/<faculty_id>/mentees', methods=['GET'])
@login_required
@role_required('admin')
def get_faculty_mentees(faculty_id):
    f = Faculty.query.filter_by(username=faculty_id).first_or_404()
    mentees = [{'admission_number': m.admission_number, 'name': m.full_name, 'email': m.email}
               for m in (f.mentees or [])]
    return jsonify({'status': 'ok', 'data': mentees}), 200


# ═══════════════════════════════════════════════════════════════════
#  HOD MANAGEMENT
# ═══════════════════════════════════════════════════════════════════

@admin_bp.route('/hod', methods=['GET'])
@login_required
@role_required('admin')
def get_hods():
    # One entry per department
    from sqlalchemy import func
    depts = db.session.query(Faculty.department).distinct().all()
    result = []
    for (dept,) in depts:
        hod = Faculty.query.filter_by(department=dept, is_hod=True).first()
        result.append({
            'department': dept,
            'hod': {'faculty_id': hod.username, 'name': hod.name, 'email': hod.email} if hod else None,
        })
    return jsonify({'status': 'ok', 'data': result}), 200


@admin_bp.route('/hod/assign', methods=['POST'])
@login_required
@role_required('admin')
def assign_hod():
    data  = request.get_json(force=True) or {}
    dept  = data.get('department')
    f_id  = data.get('faculty_id')
    if not dept or not f_id:
        return jsonify({'status': 'error', 'message': 'department and faculty_id required'}), 400

    # Clear existing HOD
    old = Faculty.query.filter_by(department=dept, is_hod=True).first()
    if old:
        old.is_hod             = False
        old.is_mentor_eligible = (
            old.status == 'Live' and
            old.designation not in ('HOD', 'Lab Assistant', 'Admin') and
            old.department not in ('BSH', 'Basic Science and Humanities', 'Basic Sciences & Humanities')
        )

    new_hod = Faculty.query.filter_by(username=f_id).first_or_404()
    new_hod.is_hod             = True
    new_hod.is_mentor_eligible = False
    new_hod.designation        = 'HOD'
    db.session.commit()
    return jsonify({'status': 'ok', 'data': {
        'department': dept,
        'hod': {'faculty_id': new_hod.username, 'name': new_hod.name},
    }}), 200


@admin_bp.route('/hod/remove', methods=['POST'])
@login_required
@role_required('admin')
def remove_hod():
    dept = (request.get_json(force=True) or {}).get('department')
    if not dept:
        return jsonify({'status': 'error', 'message': 'department required'}), 400
    hod = Faculty.query.filter_by(department=dept, is_hod=True).first()
    if hod:
        hod.is_hod        = False
        hod.designation   = 'Faculty'
        hod.is_mentor_eligible = True
        db.session.commit()
    return jsonify({'status': 'ok', 'message': 'HOD removed.', 'department': dept}), 200


# ═══════════════════════════════════════════════════════════════════
#  BATCH MANAGEMENT
# ═══════════════════════════════════════════════════════════════════

@admin_bp.route('/batches', methods=['GET'])
@login_required
@role_required('admin')
def get_batches():
    batches = Batch.query.all()
    result  = []
    for b in batches:
        c = Course.query.get(b.course_id)
        result.append({
            'id':            b.id,
            'course':        c.name if c else 'Unknown',
            'course_id':     b.course_id,
            'start_year':    b.start_year,
            'end_year':      b.end_year,
            'status':        b.status,
            'student_count': Student.query.filter_by(batch_id=b.id).count(),
        })
    return jsonify({'status': 'ok', 'data': result}), 200


@admin_bp.route('/batches', methods=['POST'])
@login_required
@role_required('admin')
def create_batch():
    data        = request.get_json(force=True) or {}
    course_id   = data.get('course_id')
    start_year  = data.get('start_year')
    if not course_id or not start_year:
        return jsonify({'status': 'error', 'message': 'course_id and start_year required'}), 400

    current_year = datetime.utcnow().year
    start_year   = int(start_year)
    if start_year != current_year:
        return jsonify({'status': 'error', 'message': f'start_year must be {current_year}'}), 400

    # Promote expired batches first
    try:
        promote_expired_batches_to_alumni()
    except Exception:
        pass

    if Batch.query.filter_by(course_id=course_id, start_year=start_year).first():
        return jsonify({'status': 'error', 'message': 'Batch already exists for this course/year'}), 400

    c = Course.query.get(course_id)
    if not c:
        return jsonify({'status': 'error', 'message': 'Course not found'}), 404

    b = Batch(course_id=course_id, start_year=start_year,
              end_year=start_year + c.duration_years, status='active')
    db.session.add(b)
    db.session.commit()
    return jsonify({'status': 'ok', 'data': {'batch_id': b.id, 'start_year': start_year,
                                              'end_year': b.end_year}}), 201


@admin_bp.route('/batches/<int:batch_id>', methods=['PATCH'])
@login_required
@role_required('admin')
def update_batch(batch_id):
    b    = Batch.query.get_or_404(batch_id)
    data = request.get_json(force=True) or {}
    if 'status' in data:
        b.status = data['status']
    db.session.commit()
    return jsonify({'status': 'ok', 'message': 'Updated.'}), 200


# ═══════════════════════════════════════════════════════════════════
#  MENTOR ALLOCATION
# ═══════════════════════════════════════════════════════════════════

@admin_bp.route('/allocation/courses', methods=['GET'])
@login_required
@role_required('admin')
def alloc_courses():
    dept   = request.args.get('department', '')
    if dept:
        courses = Course.query.filter(
            (Course.code == dept) | (Course.name.ilike(f'%{dept}%'))
        ).all()
    else:
        courses = Course.query.all()
    return jsonify({'status': 'ok', 'data': [{'id': c.id, 'name': c.name, 'code': c.code} for c in courses]}), 200


@admin_bp.route('/allocation/batches', methods=['GET'])
@login_required
@role_required('admin')
def alloc_batches():
    cid     = request.args.get('course_id')
    q       = Batch.query.filter_by(status='active')
    if cid:
        q = q.filter_by(course_id=int(cid))
    batches = q.all()
    return jsonify({'status': 'ok', 'data': [
        {'id': b.id, 'label': f'{b.start_year}-{b.end_year}', 'start_year': b.start_year}
        for b in batches
    ]}), 200


@admin_bp.route('/allocation/preview', methods=['GET'])
@login_required
@role_required('admin')
def alloc_preview():
    dept   = request.args.get('department')
    cid    = request.args.get('course_id')
    bid    = request.args.get('batch_id')
    if not bid:
        return jsonify({'status': 'error', 'message': 'batch_id required'}), 400
    result = preview_allocation(dept, cid, int(bid))
    return jsonify({'status': 'ok', 'data': result}), 200


@admin_bp.route('/allocation/confirm', methods=['POST'])
@login_required
@role_required('admin')
def alloc_confirm():
    data = request.get_json(force=True) or {}
    batch_id = data.get('batch_id')
    if not batch_id:
        return jsonify({'status': 'error', 'message': 'batch_id required'}), 400

    # Re-run preview to get distribution and save it
    result = preview_allocation(None, None, int(batch_id))
    if 'error' in result:
        return jsonify({'status': 'error', 'message': result['error']}), 400

    dist_payload = {'distribution': result.get('distribution', [])}
    saved = confirm_allocation(dist_payload)
    return jsonify({'status': 'ok', 'data': saved}), 200


@admin_bp.route('/allocation/clear', methods=['POST'])
@login_required
@role_required('admin')
def alloc_clear():
    data     = request.get_json(force=True) or {}
    batch_id = data.get('batch_id')
    if not batch_id:
        return jsonify({'status': 'error', 'message': 'batch_id required'}), 400
    students = Student.query.filter_by(batch_id=int(batch_id)).all()
    for s in students:
        s.mentor_id = None
    db.session.commit()
    return jsonify({'status': 'ok', 'message': f'Cleared {len(students)} mentor assignments.'}), 200


@admin_bp.route('/allocation/manual', methods=['POST'])
@login_required
@role_required('admin')
def alloc_manual():
    data = request.get_json(force=True) or {}
    adm  = data.get('admission_number')
    fid  = data.get('faculty_id')
    if not adm or fid is None:
        return jsonify({'status': 'error', 'message': 'admission_number and faculty_id required'}), 400
    s = Student.query.get_or_404(adm)
    f = Faculty.query.get_or_404(int(fid))
    s.mentor_id = f.id
    db.session.commit()
    return jsonify({'status': 'ok', 'message': f'{adm} assigned to {f.name}'}), 200


# ═══════════════════════════════════════════════════════════════════
#  TIMETABLE MANAGEMENT
# ═══════════════════════════════════════════════════════════════════

@admin_bp.route('/timetable/upload', methods=['POST'])
@login_required
@role_required('admin')
def upload_timetable():
    file         = request.files.get('file')
    dept         = request.form.get('department', '')
    course_id    = request.form.get('course_id')
    batch_id     = request.form.get('batch_id')
    semester     = request.form.get('semester')
    academic_year = request.form.get('academic_year', '')
    uploader_id  = session.get('user_id')

    if not file:
        return jsonify({'status': 'error', 'message': 'No file provided'}), 400
    if file.mimetype not in ALLOWED_TIMETABLE_MIMES:
        return jsonify({'status': 'error', 'message': 'Invalid file type. Allowed: PDF, JPG, PNG, XLSX'}), 400
    if not batch_id or not semester:
        return jsonify({'status': 'error', 'message': 'batch_id and semester required'}), 400

    # Build save path
    filename   = secure_filename(file.filename)
    save_dir   = os.path.join(current_app.root_path, 'static', 'uploads', 'timetables',
                              dept, str(course_id or 'unknown'), str(batch_id), str(semester))
    os.makedirs(save_dir, exist_ok=True)
    save_path  = os.path.join(save_dir, filename)

    # Delete old record for same batch+semester
    old = Timetable.query.filter_by(batch_id=int(batch_id), semester=int(semester)).first()
    if old:
        try:
            if old.file_path and os.path.exists(os.path.join(current_app.root_path, old.file_path)):
                os.remove(os.path.join(current_app.root_path, old.file_path))
        except Exception:
            pass
        db.session.delete(old)

    file.save(save_path)
    rel_path = os.path.relpath(save_path, current_app.root_path).replace('\\', '/')

    tt = Timetable(
        department=dept,
        course_id=int(course_id) if course_id else None,
        batch_id=int(batch_id),
        semester=int(semester),
        academic_year=academic_year,
        file_path=rel_path,
        uploaded_by=uploader_id,
        uploaded_at=datetime.utcnow(),
    )
    db.session.add(tt)
    db.session.flush()  # get tt.id

    # Notify enrolled students
    students = Student.query.filter_by(batch_id=int(batch_id), status='Live').all()
    for s in students:
        db.session.add(Notification(
            student_id=s.admission_number,
            title='Timetable Updated',
            message=f'Semester {semester} timetable for {academic_year} is now available.',
            type='timetable',
            is_read=False,
        ))

    db.session.commit()
    return jsonify({'status': 'ok', 'data': {
        'message':        'Timetable uploaded.',
        'timetable_id':   tt.id,
        'notified_count': len(students),
        'download_url':   f'/{rel_path}',
    }}), 200


@admin_bp.route('/timetable', methods=['GET'])
@login_required
@role_required('admin')
def get_timetables():
    tts    = Timetable.query.filter(Timetable.file_path.isnot(None)).all()
    result = []
    for t in tts:
        uploader_name = Faculty.query.get(t.uploaded_by).name if t.uploaded_by else None
        result.append({
            'id':             t.id,
            'department':     t.department,
            'course_id':      t.course_id,
            'batch_id':       t.batch_id,
            'semester':       t.semester,
            'academic_year':  t.academic_year,
            'filename':       os.path.basename(t.file_path) if t.file_path else None,
            'download_url':   f'/{t.file_path}' if t.file_path else None,
            'uploaded_at':    t.uploaded_at.isoformat() if t.uploaded_at else None,
            'uploaded_by':    uploader_name,
        })
    return jsonify({'status': 'ok', 'data': result}), 200


@admin_bp.route('/timetable/<int:tt_id>', methods=['DELETE'])
@login_required
@role_required('admin')
def delete_timetable(tt_id):
    tt = Timetable.query.get_or_404(tt_id)
    if tt.file_path:
        full = os.path.join(current_app.root_path, tt.file_path)
        if os.path.exists(full):
            try:
                os.remove(full)
            except Exception:
                pass
    db.session.delete(tt)
    db.session.commit()
    return jsonify({'status': 'ok', 'message': 'Deleted.'}), 200
