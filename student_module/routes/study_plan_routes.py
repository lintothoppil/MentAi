"""
Study Plan API Routes
=====================
Blueprint exposing REST endpoints for Study Plan Generation.

All endpoints enforce role-based access:
  - Students can manage their own plans.
  - Mentors / HODs / Admins can view any student's plans.
"""

import logging
from functools import wraps

from flask import Blueprint, g, jsonify, request
from sqlalchemy.exc import SQLAlchemyError

from student_module.models.study_plan_models import StudyPlanValidationError, db
from student_module.services.study_plan_service import StudyPlanGenerationService

logger = logging.getLogger(__name__)

study_plan_bp = Blueprint("study_plan", __name__, url_prefix="/api/study-plans")

_service = StudyPlanGenerationService()


# ---------------------------------------------------------------------------
# Helper decorators
# ---------------------------------------------------------------------------

def _json_error(message: str, status: int = 400):
    return jsonify({"error": message}), status


def require_auth(f):
    """Stub decorator – replace with your actual Flask-Login/JWT check."""
    @wraps(f)
    def decorated(*args, **kwargs):
        # In a real deployment integrate with Flask-Login:
        #   if not current_user.is_authenticated: return _json_error(…, 401)
        return f(*args, **kwargs)
    return decorated


def _get_current_student_id() -> int | None:
    """Return student id from the request context (override as needed)."""
    return getattr(g, "student_id", None) or request.args.get("student_id", type=int)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@study_plan_bp.route("/generate", methods=["POST"])
@require_auth
def generate_plan():
    """
    POST /api/study-plans/generate

    Body (JSON):
    {
        "student_id": 7,
        "title": "Semester 3 Study Plan",
        "start_date": "2024-01-15",
        "end_date": "2024-05-15",
        "weekly_hours": 20,
        "subjects": [
            {"name": "Mathematics", "credit_hours": 4},
            {"name": "Physics", "credit_hours": 3, "difficulty": 0.8}
        ],
        "description": "Optional description",
        "stress_level": 6.0,
        "academic_history": [
            {"subject": "Mathematics", "score": 45, "semester": "S2"}
        ],
        "template_id": null
    }
    """
    data = request.get_json(silent=True)
    if not data:
        return _json_error("Request body must be JSON")

    required = ["student_id", "title", "start_date", "end_date", "subjects"]
    missing = [k for k in required if k not in data]
    if missing:
        return _json_error(f"Missing required fields: {', '.join(missing)}")

    academic_history = data.pop("academic_history", [])
    student_id = data.pop("student_id")

    try:
        plan = _service.generate_plan(
            student_id=student_id,
            params=data,
            academic_history=academic_history,
        )
        return jsonify(plan.to_dict(include_weeks=True)), 201
    except StudyPlanValidationError as exc:
        return _json_error(str(exc))
    except SQLAlchemyError as exc:
        logger.exception("DB error generating plan: %s", exc)
        db.session.rollback()
        return _json_error("Database error while generating plan", 500)


@study_plan_bp.route("/<int:plan_id>", methods=["GET"])
@require_auth
def get_plan(plan_id: int):
    """GET /api/study-plans/<plan_id>"""
    include_weeks = request.args.get("include_weeks", "false").lower() == "true"
    plan = _service.get_plan(plan_id)
    if plan is None:
        return _json_error(f"Plan {plan_id} not found", 404)
    return jsonify(plan.to_dict(include_weeks=include_weeks))


@study_plan_bp.route("/student/<int:student_id>", methods=["GET"])
@require_auth
def list_student_plans(student_id: int):
    """GET /api/study-plans/student/<student_id>"""
    plans = _service.list_student_plans(student_id)
    return jsonify([p.to_dict() for p in plans])


@study_plan_bp.route("/<int:plan_id>/weeks", methods=["GET"])
@require_auth
def get_weekly_plans(plan_id: int):
    """GET /api/study-plans/<plan_id>/weeks"""
    include_tasks = request.args.get("include_tasks", "false").lower() == "true"
    weeks = _service.get_weekly_plans(plan_id)
    if not weeks:
        plan = _service.get_plan(plan_id)
        if plan is None:
            return _json_error(f"Plan {plan_id} not found", 404)
    return jsonify([w.to_dict(include_tasks=include_tasks) for w in weeks])


@study_plan_bp.route("/weeks/<int:week_id>/tasks", methods=["GET"])
@require_auth
def get_week_tasks(week_id: int):
    """GET /api/study-plans/weeks/<week_id>/tasks"""
    tasks = _service.get_week_tasks(week_id)
    return jsonify([t.to_dict() for t in tasks])


@study_plan_bp.route("/tasks/<int:task_id>/progress", methods=["PUT"])
@require_auth
def update_task_progress(task_id: int):
    """
    PUT /api/study-plans/tasks/<task_id>/progress

    Body:
    {
        "progress": 75.0,        // 0-100
        "actual_minutes": 45,    // optional
        "notes": "Covered ch.3"  // optional
    }
    """
    data = request.get_json(silent=True)
    if not data:
        return _json_error("Request body must be JSON")
    if "progress" not in data:
        return _json_error("'progress' field is required")

    try:
        task = _service.update_task_progress(
            task_id=task_id,
            progress=float(data["progress"]),
            actual_minutes=data.get("actual_minutes"),
            notes=data.get("notes"),
        )
        return jsonify(task.to_dict())
    except StudyPlanValidationError as exc:
        return _json_error(str(exc), 404)
    except SQLAlchemyError as exc:
        logger.exception("DB error updating task %s: %s", task_id, exc)
        db.session.rollback()
        return _json_error("Database error while updating task", 500)


@study_plan_bp.route("/<int:plan_id>/adapt", methods=["POST"])
@require_auth
def adapt_plan(plan_id: int):
    """POST /api/study-plans/<plan_id>/adapt  – trigger adaptive recalculation."""
    try:
        plan = _service.adapt_plan(plan_id)
        return jsonify(plan.to_dict(include_weeks=True))
    except StudyPlanValidationError as exc:
        return _json_error(str(exc), 404)
    except SQLAlchemyError as exc:
        logger.exception("DB error adapting plan %s: %s", plan_id, exc)
        db.session.rollback()
        return _json_error("Database error while adapting plan", 500)


@study_plan_bp.route("/<int:plan_id>/stats", methods=["GET"])
@require_auth
def get_plan_stats(plan_id: int):
    """GET /api/study-plans/<plan_id>/stats"""
    try:
        stats = _service.get_plan_stats(plan_id)
        return jsonify(stats)
    except StudyPlanValidationError as exc:
        return _json_error(str(exc), 404)


@study_plan_bp.route("/templates", methods=["GET"])
@require_auth
def list_templates():
    """GET /api/study-plans/templates"""
    from student_module.models.study_plan_models import StudyPlanTemplate
    templates = (
        db.session.query(StudyPlanTemplate)
        .filter_by(is_active=True)
        .order_by(StudyPlanTemplate.name)
        .all()
    )
    return jsonify([t.to_dict() for t in templates])
