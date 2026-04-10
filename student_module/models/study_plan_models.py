"""
Study Plan Generation Module - Database Models
==============================================
SQLAlchemy models for the Study Plan Generation feature.
All datetime fields use timezone-aware UTC timestamps.
"""

from datetime import datetime, timezone
from enum import Enum as PyEnum

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class StudyPlanValidationError(ValueError):
    """
    Raised by the service layer for user-facing validation failures.
    Messages from this exception are safe to return in API responses.
    """


class PlanStatus(PyEnum):
    ACTIVE = "active"
    COMPLETED = "completed"
    ARCHIVED = "archived"
    PAUSED = "paused"


class TaskStatus(PyEnum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"


class TaskPriority(PyEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class StudyPlanTemplate(db.Model):
    """Predefined templates that can be used to quickly generate study plans."""

    __tablename__ = "study_plan_templates"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text)
    # JSON-encoded list of subject configurations
    subject_config = db.Column(db.JSON, nullable=False, default=list)
    # Total weeks the template spans
    duration_weeks = db.Column(db.Integer, nullable=False, default=12)
    # Daily study hours recommended by template
    daily_hours = db.Column(db.Float, nullable=False, default=3.0)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationship
    study_plans = db.relationship(
        "StudyPlan", back_populates="template", lazy="dynamic"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "subject_config": self.subject_config,
            "duration_weeks": self.duration_weeks,
            "daily_hours": self.daily_hours,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }

    def __repr__(self):
        return f"<StudyPlanTemplate {self.name}>"


class StudyPlan(db.Model):
    """Main study plan entity for a student."""

    __tablename__ = "study_plans"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    template_id = db.Column(
        db.Integer, db.ForeignKey("study_plan_templates.id"), nullable=True
    )
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    status = db.Column(
        db.Enum(PlanStatus), default=PlanStatus.ACTIVE, nullable=False
    )
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    # Total weekly hours the student has available
    total_weekly_hours = db.Column(db.Float, nullable=False, default=20.0)
    # JSON-encoded list of enrolled subjects with metadata
    subjects = db.Column(db.JSON, nullable=False, default=list)
    # Overall progress percentage (0-100)
    overall_progress = db.Column(db.Float, default=0.0, nullable=False)
    # AI-generated insights stored as JSON
    ai_insights = db.Column(db.JSON, default=dict)
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    template = db.relationship("StudyPlanTemplate", back_populates="study_plans")
    weekly_plans = db.relationship(
        "WeeklyPlan",
        back_populates="study_plan",
        cascade="all, delete-orphan",
        order_by="WeeklyPlan.week_number",
    )

    def compute_overall_progress(self):
        """Recompute and persist the overall progress from weekly plans."""
        if not self.weekly_plans:
            self.overall_progress = 0.0
            return
        total = sum(wp.completion_percentage for wp in self.weekly_plans)
        self.overall_progress = round(total / len(self.weekly_plans), 2)

    def to_dict(self, include_weeks=False):
        data = {
            "id": self.id,
            "student_id": self.student_id,
            "template_id": self.template_id,
            "title": self.title,
            "description": self.description,
            "status": self.status.value,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "total_weekly_hours": self.total_weekly_hours,
            "subjects": self.subjects,
            "overall_progress": self.overall_progress,
            "ai_insights": self.ai_insights,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
        if include_weeks:
            data["weekly_plans"] = [wp.to_dict() for wp in self.weekly_plans]
        return data

    def __repr__(self):
        return f"<StudyPlan {self.id} student={self.student_id}>"


class WeeklyPlan(db.Model):
    """Weekly breakdown of a study plan."""

    __tablename__ = "weekly_plans"

    id = db.Column(db.Integer, primary_key=True)
    study_plan_id = db.Column(
        db.Integer, db.ForeignKey("study_plans.id"), nullable=False
    )
    week_number = db.Column(db.Integer, nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    # Planned hours for this week
    allocated_hours = db.Column(db.Float, nullable=False, default=0.0)
    # Actual hours logged
    actual_hours = db.Column(db.Float, default=0.0, nullable=False)
    # Completion 0-100
    completion_percentage = db.Column(db.Float, default=0.0, nullable=False)
    # JSON: subject -> hours mapping for this week
    subject_hours = db.Column(db.JSON, default=dict)
    # Mentor or system notes for the week
    notes = db.Column(db.Text)
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    study_plan = db.relationship("StudyPlan", back_populates="weekly_plans")
    daily_tasks = db.relationship(
        "DailyTask",
        back_populates="weekly_plan",
        cascade="all, delete-orphan",
        order_by="DailyTask.scheduled_date",
    )

    def compute_completion(self):
        """Recompute completion percentage based on daily tasks."""
        tasks = self.daily_tasks
        if not tasks:
            self.completion_percentage = 0.0
            return
        done = sum(1 for t in tasks if t.status == TaskStatus.COMPLETED)
        self.completion_percentage = round((done / len(tasks)) * 100, 2)

    def to_dict(self, include_tasks=False):
        data = {
            "id": self.id,
            "study_plan_id": self.study_plan_id,
            "week_number": self.week_number,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "allocated_hours": self.allocated_hours,
            "actual_hours": self.actual_hours,
            "completion_percentage": self.completion_percentage,
            "subject_hours": self.subject_hours,
            "notes": self.notes,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
        if include_tasks:
            data["daily_tasks"] = [t.to_dict() for t in self.daily_tasks]
        return data

    def __repr__(self):
        return f"<WeeklyPlan plan={self.study_plan_id} week={self.week_number}>"


class DailyTask(db.Model):
    """Individual study task within a weekly plan."""

    __tablename__ = "daily_tasks"

    id = db.Column(db.Integer, primary_key=True)
    weekly_plan_id = db.Column(
        db.Integer, db.ForeignKey("weekly_plans.id"), nullable=False
    )
    subject_name = db.Column(db.String(150), nullable=False)
    title = db.Column(db.String(300), nullable=False)
    description = db.Column(db.Text)
    scheduled_date = db.Column(db.Date, nullable=False)
    # Estimated duration in minutes
    estimated_minutes = db.Column(db.Integer, nullable=False, default=60)
    # Actual time spent in minutes
    actual_minutes = db.Column(db.Integer, default=0, nullable=False)
    status = db.Column(
        db.Enum(TaskStatus), default=TaskStatus.PENDING, nullable=False
    )
    priority = db.Column(
        db.Enum(TaskPriority), default=TaskPriority.MEDIUM, nullable=False
    )
    # Progress 0-100 for in-progress tasks
    progress_percentage = db.Column(db.Float, default=0.0, nullable=False)
    # Free-form notes added by the student
    student_notes = db.Column(db.Text)
    # Resource links or references (JSON list)
    resources = db.Column(db.JSON, default=list)
    completed_at = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationship
    weekly_plan = db.relationship("WeeklyPlan", back_populates="daily_tasks")

    def mark_completed(self):
        self.status = TaskStatus.COMPLETED
        self.progress_percentage = 100.0
        self.completed_at = datetime.now(timezone.utc)

    def to_dict(self):
        return {
            "id": self.id,
            "weekly_plan_id": self.weekly_plan_id,
            "subject_name": self.subject_name,
            "title": self.title,
            "description": self.description,
            "scheduled_date": self.scheduled_date.isoformat(),
            "estimated_minutes": self.estimated_minutes,
            "actual_minutes": self.actual_minutes,
            "status": self.status.value,
            "priority": self.priority.value,
            "progress_percentage": self.progress_percentage,
            "student_notes": self.student_notes,
            "resources": self.resources,
            "completed_at": (
                self.completed_at.isoformat() if self.completed_at else None
            ),
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }

    def __repr__(self):
        return f"<DailyTask {self.id} '{self.title[:30]}'>"
