from functools import wraps
from flask import session, jsonify


def _normalize_role(role: str) -> str:
    return str(role or "").strip().lower().replace(" ", "-").replace("_", "-")


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'status': 'error', 'message': 'Unauthorized. Please login.'}), 401
        return f(*args, **kwargs)
    return decorated


def role_required(*roles):
    """Accept one or more roles, e.g. @role_required('admin') or @role_required('mentor','hod')"""
    normalized = {_normalize_role(r) for r in roles}
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            # Support both session keys used across the codebase.
            user_role = session.get('role') or session.get('user_role') or ''
            if _normalize_role(user_role) not in normalized:
                return jsonify({'status': 'error', 'message': f'Forbidden. Required role: {" or ".join(roles)}.'}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator
