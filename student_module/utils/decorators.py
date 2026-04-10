from functools import wraps
from flask import session, jsonify


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'status': 'error', 'message': 'Unauthorized. Please login.'}), 401
        return f(*args, **kwargs)
    return decorated


def role_required(*roles):
    """Accept one or more roles, e.g. @role_required('admin') or @role_required('mentor','hod')"""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            user_role = session.get('role', '')
            if user_role not in roles:
                return jsonify({'status': 'error', 'message': f'Forbidden. Required role: {" or ".join(roles)}.'}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator
