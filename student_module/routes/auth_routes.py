"""
routes/auth_routes.py
All auth endpoints.  Non-redirect routes return JSON.
"""
from flask import Blueprint, request, jsonify, session
from flask_bcrypt import Bcrypt
from models import db, Student, Faculty, LoginCredential, SubjectAllocation, Timetable

bcrypt = Bcrypt()

auth_bp = Blueprint('auth_routes', __name__, url_prefix='/auth')


# ── helpers ───────────────────────────────────────────────────────────────────

def _set_session(user_id, role: str, name: str):
    session.clear()
    session['user_id'] = user_id
    session['role']    = role
    session['name']    = name
    session.permanent  = True


# ── Student ───────────────────────────────────────────────────────────────────

@auth_bp.route('/student/login', methods=['POST'])
def student_login():
    data           = request.get_json(force=True) or {}
    adm_no         = data.get('admission_number', '').strip().upper()
    password       = data.get('password', '')

    student = Student.query.get(adm_no)
    if not student:
        return jsonify({'status': 'error', 'message': 'Not registered. Contact admin.'}), 404

    if not student.password_hash:
        return jsonify({'status': 'set_password', 'redirect': '/student/set-password'}), 200

    if not bcrypt.check_password_hash(student.password_hash, password):
        return jsonify({'status': 'error', 'message': 'Invalid credentials.'}), 401

    _set_session(adm_no, 'student', student.full_name)
    return jsonify({
        'status': 'ok',
        'redirect': '/student/dashboard',
        'data': {'user_id': adm_no, 'role': 'student', 'name': student.full_name},
    }), 200


@auth_bp.route('/student/set-password', methods=['POST'])
def student_set_password():
    data             = request.get_json(force=True) or {}
    adm_no           = data.get('admission_number', '').strip().upper()
    new_password     = data.get('new_password', '')
    confirm_password = data.get('confirm_password', '')

    if new_password != confirm_password:
        return jsonify({'status': 'error', 'message': 'Passwords do not match.'}), 400
    if len(new_password) < 8:
        return jsonify({'status': 'error', 'message': 'Password must be at least 8 characters.'}), 400

    student = Student.query.get(adm_no)
    if not student:
        return jsonify({'status': 'error', 'message': 'Student not found.'}), 404

    student.password_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
    student.status        = 'Live'

    # Keep LoginCredential in sync (backward compat)
    cred = LoginCredential.query.get(adm_no)
    if cred:
        cred.password_hash = student.password_hash
    else:
        db.session.add(LoginCredential(admission_number=adm_no, password_hash=student.password_hash))

    db.session.commit()
    _set_session(adm_no, 'student', student.full_name)
    return jsonify({'status': 'ok', 'redirect': '/student/complete-profile'}), 200


# ── Faculty ───────────────────────────────────────────────────────────────────

def _faculty_role(faculty: Faculty) -> str:
    return _faculty_default_role(faculty)[0]


def _faculty_allowed_roles(faculty: Faculty) -> list[str]:
    if faculty.designation and faculty.designation.lower() == 'admin':
        return ['admin']

    roles: list[str] = []
    if faculty.is_hod:
        roles.append('hod')

    # Mentoring role: allow if eligible or has mentees.
    if bool(faculty.is_mentor_eligible) or bool(faculty.mentees):
        roles.append('mentor')

    # Subject handler role: allow if flagged OR if they actually handle subjects (timetable/allocations).
    if bool(faculty.is_subject_handler) or _faculty_has_active_subjects(faculty.id):
        roles.append('subject-handler')

    if not roles:
        roles = ['mentor']

    # De-dup while preserving order.
    seen: set[str] = set()
    ordered: list[str] = []
    for r in roles:
        if r not in seen:
            ordered.append(r)
            seen.add(r)
    return ordered


def _faculty_has_active_subjects(faculty_id: int) -> bool:
    # "Handling a subject" = allocated to at least one subject or appears as a timetable handler.
    if SubjectAllocation.query.filter_by(faculty_id=faculty_id).first() is not None:
        return True
    if Timetable.query.filter_by(handler_id=faculty_id).first() is not None:
        return True
    return False


def _faculty_default_role(faculty: Faculty) -> tuple[str, list[str]]:
    roles = _faculty_allowed_roles(faculty)

    # Admin/HOD defaults.
    if 'admin' in roles:
        return 'admin', roles
    if roles == ['hod']:
        return 'hod', roles

    # If they can do both, default to subject handler only when they actually handle a subject.
    if 'mentor' in roles and 'subject-handler' in roles:
        return ('subject-handler' if _faculty_has_active_subjects(faculty.id) else 'mentor'), roles

    # Otherwise pick the first available role.
    return roles[0], roles


@auth_bp.route('/faculty/login', methods=['POST'])
def faculty_login():
    data       = request.get_json(force=True) or {}
    faculty_id = str(data.get('faculty_id', '')).strip()
    password   = data.get('password', '')

    faculty = Faculty.query.filter_by(username=faculty_id).first()
    if not faculty and faculty_id.isdigit():
        faculty = Faculty.query.get(int(faculty_id))
    if not faculty:
        return jsonify({'status': 'error', 'message': 'Not registered. Contact admin.'}), 404

    if not faculty.password_hash:
        return jsonify({'status': 'set_password'}), 200

    if not bcrypt.check_password_hash(faculty.password_hash, password):
        return jsonify({'status': 'error', 'message': 'Invalid credentials.'}), 401

    role, allowed_roles = _faculty_default_role(faculty)
    redirect = f'/{role}/dashboard'
    _set_session(faculty.id, role, faculty.name)
    session['faculty_username'] = faculty.username
    session['allowed_roles'] = allowed_roles
    # Keep legacy session keys in sync (used by app.py routes).
    session['user_role'] = role
    session['user_roles'] = allowed_roles

    return jsonify({
        'status': 'ok',
        'redirect': redirect,
        'role': role,
        'data': {
            'faculty_id': faculty.id,
            'username': faculty.username,
            'name': faculty.name,
            'role': role,
            'allowed_roles': allowed_roles,
        },
    }), 200


@auth_bp.route('/faculty/set-password', methods=['POST'])
def faculty_set_password():
    data             = request.get_json(force=True) or {}
    faculty_id       = str(data.get('faculty_id', '')).strip()
    new_password     = data.get('new_password', '')
    confirm_password = data.get('confirm_password', '')

    if new_password != confirm_password:
        return jsonify({'status': 'error', 'message': 'Passwords do not match.'}), 400
    if len(new_password) < 8:
        return jsonify({'status': 'error', 'message': 'Password must be at least 8 characters.'}), 400

    faculty = Faculty.query.filter_by(username=faculty_id).first()
    if not faculty and faculty_id.isdigit():
        faculty = Faculty.query.get(int(faculty_id))
    if not faculty:
        return jsonify({'status': 'error', 'message': 'Faculty not found.'}), 404

    faculty.password_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
    faculty.status        = 'Live'
    db.session.commit()

    role, allowed_roles = _faculty_default_role(faculty)
    redirect = f'/{role}/dashboard'
    _set_session(faculty.id, role, faculty.name)
    session['faculty_username'] = faculty.username
    session['allowed_roles'] = allowed_roles
    session['user_role'] = role
    session['user_roles'] = allowed_roles

    return jsonify({'status': 'ok', 'redirect': redirect, 'role': role, 'allowed_roles': allowed_roles}), 200


@auth_bp.route('/faculty/switch-role', methods=['POST'])
def faculty_switch_role():
    """Switch the active faculty role between mentor and subject_handler (if permitted)."""
    if 'user_id' not in session:
        return jsonify({'status': 'error', 'message': 'Unauthorized. Please login.'}), 401

    data = request.get_json(force=True) or {}
    requested = str(data.get('role') or '').strip().lower().replace('_', '-')

    # Only allow switching between these (avoid breaking admin/hod flows).
    if requested not in ('mentor', 'subject-handler', 'hod'):
        return jsonify({'status': 'error', 'message': 'Invalid role'}), 400

    faculty = Faculty.query.get(session.get('user_id'))
    if not faculty:
        session.clear()
        return jsonify({'status': 'error', 'message': 'Session user not found'}), 401

    _, allowed_roles = _faculty_default_role(faculty)
    if requested not in allowed_roles:
        return jsonify({'status': 'error', 'message': 'Forbidden: role not permitted'}), 403

    session['role'] = requested
    session['allowed_roles'] = allowed_roles
    session['user_role'] = requested
    session['user_roles'] = allowed_roles

    return jsonify({
        'status': 'ok',
        'role': requested,
        'redirect': f'/{requested}/dashboard',
        'allowed_roles': allowed_roles,
    }), 200


# ── Admin ─────────────────────────────────────────────────────────────────────

@auth_bp.route('/admin/login', methods=['POST'])
def admin_login():
    data     = request.get_json(force=True) or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')

    admin = Faculty.query.filter_by(username=username, designation='Admin').first()
    if not admin or not admin.password_hash:
        return jsonify({'status': 'error', 'message': 'Invalid admin credentials.'}), 401

    if not bcrypt.check_password_hash(admin.password_hash, password):
        return jsonify({'status': 'error', 'message': 'Invalid admin credentials.'}), 401

    _set_session(admin.id, 'admin', admin.name)
    return jsonify({
        'status': 'ok',
        'redirect': '/admin/dashboard',
        'data': {'role': 'admin', 'name': admin.name},
    }), 200


# ── Common ────────────────────────────────────────────────────────────────────

@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'status': 'ok', 'message': 'Logged out.'}), 200


@auth_bp.route('/session', methods=['GET'])
def get_session():
    if 'user_id' in session:
        return jsonify({
            'status': 'ok',
            'data': {
                'logged_in': True,
                'role':      session.get('role'),
                'user_id':   session.get('user_id'),
                'name':      session.get('name'),
                'allowed_roles': session.get('allowed_roles'),
            },
        }), 200
    return jsonify({'status': 'ok', 'data': {'logged_in': False}}), 200
