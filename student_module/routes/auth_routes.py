"""
routes/auth_routes.py
All auth endpoints.  Non-redirect routes return JSON.
"""
from flask import Blueprint, request, jsonify, session
from flask_bcrypt import Bcrypt
from models import db, Student, Faculty, LoginCredential

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
    if faculty.designation and faculty.designation.lower() == 'admin':
        return 'admin'
    if faculty.is_hod:
        return 'hod'
    if faculty.is_subject_handler:
        return 'subject_handler'
    return 'mentor'


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

    role     = _faculty_role(faculty)
    redirect = f'/{role}/dashboard'
    _set_session(faculty.id, role, faculty.name)
    session['faculty_username'] = faculty.username

    return jsonify({
        'status': 'ok',
        'redirect': redirect,
        'role': role,
        'data': {'faculty_id': faculty.id, 'username': faculty.username, 'name': faculty.name, 'role': role},
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

    role     = _faculty_role(faculty)
    redirect = f'/{role}/dashboard'
    _set_session(faculty.id, role, faculty.name)
    session['faculty_username'] = faculty.username

    return jsonify({'status': 'ok', 'redirect': redirect, 'role': role}), 200


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
            },
        }), 200
    return jsonify({'status': 'ok', 'data': {'logged_in': False}}), 200
