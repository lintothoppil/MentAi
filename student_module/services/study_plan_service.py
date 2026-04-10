"""
Study Plan Generation Service
==============================
Adaptive algorithm for generating personalized study plans based on:
  - Student academic performance history
  - Subject difficulty and credit hours
  - Available study time per week
  - Upcoming deadlines / exam schedule
  - Weak subject areas and engagement patterns
  - Self-reported stress / workload levels
"""

import logging
import math
from datetime import date, datetime, timedelta, timezone
from typing import Any

from student_module.models.study_plan_models import (
    DailyTask,
    PlanStatus,
    StudyPlan,
    StudyPlanTemplate,
    StudyPlanValidationError,
    TaskPriority,
    TaskStatus,
    WeeklyPlan,
    db,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Default difficulty weights (0-1 scale; can be overridden per subject)
# ---------------------------------------------------------------------------
DEFAULT_DIFFICULTY = 0.5
DIFFICULTY_MAP: dict[str, float] = {
    "mathematics": 0.9,
    "physics": 0.85,
    "chemistry": 0.8,
    "programming": 0.75,
    "data structures": 0.75,
    "algorithms": 0.8,
    "operating systems": 0.7,
    "database management": 0.65,
    "computer networks": 0.65,
    "software engineering": 0.55,
    "english": 0.4,
    "communication skills": 0.35,
}

# Day-of-week index -> human-readable name
DAY_NAMES = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
]

# Study-session slot lengths in minutes
SLOT_SIZES = [30, 45, 60, 90, 120]


def _clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, value))


class StudyPlanGenerationService:
    """
    Core service that drives study plan creation and adaptive recalculation.

    Usage
    -----
    service = StudyPlanGenerationService()
    plan = service.generate_plan(student_id=7, params={...})
    """

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def generate_plan(
        self,
        student_id: int,
        params: dict[str, Any],
        academic_history: list[dict] | None = None,
    ) -> StudyPlan:
        """
        Generate a complete study plan for *student_id*.

        Parameters
        ----------
        student_id : int
        params : dict
            Required keys:
              - title (str)
              - start_date (str | date)  – ISO format "YYYY-MM-DD"
              - end_date   (str | date)  – ISO format "YYYY-MM-DD"
              - subjects   (list[dict])  – each item: {name, credit_hours,
                                           difficulty?, deadline?}
              - weekly_hours (float)     – total available hours per week
            Optional keys:
              - description (str)
              - stress_level (float 0-10)  – self-reported
              - template_id (int)
        academic_history : list[dict] | None
            Each item: {subject, score (0-100), semester}
        """
        logger.info("Generating study plan for student %s", student_id)

        start_date = self._parse_date(params["start_date"])
        end_date = self._parse_date(params["end_date"])
        subjects = params["subjects"]
        weekly_hours = float(params.get("weekly_hours", 20.0))
        stress_level = float(params.get("stress_level", 5.0))

        if end_date <= start_date:
            raise StudyPlanValidationError("end_date must be after start_date")
        if not subjects:
            raise StudyPlanValidationError("At least one subject is required")

        # Enrich subjects with difficulty & performance scores
        enriched = self._enrich_subjects(subjects, academic_history or [])

        # Compute per-subject hour allocations for the whole plan
        total_weeks = max(1, math.ceil((end_date - start_date).days / 7))
        subject_weights = self._compute_subject_weights(enriched, stress_level)
        subject_hours_per_week = self._allocate_hours(
            subject_weights, weekly_hours
        )

        # Build plan record
        plan = StudyPlan(
            student_id=student_id,
            template_id=params.get("template_id"),
            title=params["title"],
            description=params.get("description", ""),
            status=PlanStatus.ACTIVE,
            start_date=start_date,
            end_date=end_date,
            total_weekly_hours=weekly_hours,
            subjects=enriched,
            ai_insights=self._build_insights(
                enriched, subject_hours_per_week, stress_level
            ),
        )
        db.session.add(plan)
        db.session.flush()  # get plan.id before adding weeks

        # Generate weekly breakdown
        week_start = start_date
        for week_num in range(1, total_weeks + 1):
            week_end = min(week_start + timedelta(days=6), end_date)
            weekly_plan = self._build_weekly_plan(
                plan_id=plan.id,
                week_num=week_num,
                week_start=week_start,
                week_end=week_end,
                subject_hours_per_week=subject_hours_per_week,
                enriched_subjects=enriched,
            )
            db.session.add(weekly_plan)
            db.session.flush()

            # Generate daily tasks for this week
            tasks = self._generate_daily_tasks(
                weekly_plan=weekly_plan,
                week_start=week_start,
                week_end=week_end,
                subject_hours_per_week=subject_hours_per_week,
                enriched_subjects=enriched,
            )
            for task in tasks:
                db.session.add(task)

            week_start += timedelta(weeks=1)

        db.session.commit()
        logger.info("Study plan %s created successfully", plan.id)
        return plan

    def get_plan(self, plan_id: int) -> StudyPlan | None:
        return db.session.get(StudyPlan, plan_id)

    def list_student_plans(self, student_id: int) -> list[StudyPlan]:
        return (
            db.session.query(StudyPlan)
            .filter_by(student_id=student_id)
            .order_by(StudyPlan.created_at.desc())
            .all()
        )

    def get_weekly_plans(self, plan_id: int) -> list[WeeklyPlan]:
        return (
            db.session.query(WeeklyPlan)
            .filter_by(study_plan_id=plan_id)
            .order_by(WeeklyPlan.week_number)
            .all()
        )

    def get_week_tasks(self, week_id: int) -> list[DailyTask]:
        return (
            db.session.query(DailyTask)
            .filter_by(weekly_plan_id=week_id)
            .order_by(DailyTask.scheduled_date)
            .all()
        )

    def update_task_progress(
        self,
        task_id: int,
        progress: float,
        actual_minutes: int | None = None,
        notes: str | None = None,
    ) -> DailyTask:
        task = db.session.get(DailyTask, task_id)
        if task is None:
            raise StudyPlanValidationError(f"Task {task_id} not found")

        progress = _clamp(progress, 0.0, 100.0)
        task.progress_percentage = progress
        if actual_minutes is not None:
            task.actual_minutes = max(0, actual_minutes)
        if notes is not None:
            task.student_notes = notes

        if progress >= 100.0:
            task.mark_completed()
        elif progress > 0:
            task.status = TaskStatus.IN_PROGRESS
        task.updated_at = datetime.now(timezone.utc)

        # Propagate to weekly plan
        weekly_plan = task.weekly_plan
        weekly_plan.actual_hours = round(
            sum(t.actual_minutes for t in weekly_plan.daily_tasks) / 60, 2
        )
        weekly_plan.compute_completion()
        weekly_plan.updated_at = datetime.now(timezone.utc)

        # Propagate to study plan
        plan = weekly_plan.study_plan
        plan.compute_overall_progress()
        plan.updated_at = datetime.now(timezone.utc)

        db.session.commit()
        return task

    def adapt_plan(self, plan_id: int) -> StudyPlan:
        """
        Re-evaluate an existing plan and adjust priorities / hours for
        remaining weeks based on current completion.
        """
        plan = db.session.get(StudyPlan, plan_id)
        if plan is None:
            raise StudyPlanValidationError(f"Plan {plan_id} not found")

        today = date.today()
        remaining_weeks = [
            wp for wp in plan.weekly_plans if wp.start_date >= today
        ]
        if not remaining_weeks:
            logger.info("No remaining weeks for plan %s, nothing to adapt", plan_id)
            return plan

        # Identify subjects with low completion
        subject_completion = self._compute_subject_completion(plan)
        enriched = self._reenrich_subjects(plan.subjects, subject_completion)
        weights = self._compute_subject_weights(enriched, stress_level=5.0)
        new_allocation = self._allocate_hours(weights, plan.total_weekly_hours)

        for wp in remaining_weeks:
            wp.subject_hours = new_allocation
            wp.allocated_hours = sum(new_allocation.values())
            # Regenerate tasks for future weeks only
            for task in list(wp.daily_tasks):
                if task.status == TaskStatus.PENDING:
                    db.session.delete(task)
            db.session.flush()
            new_tasks = self._generate_daily_tasks(
                weekly_plan=wp,
                week_start=wp.start_date,
                week_end=wp.end_date,
                subject_hours_per_week=new_allocation,
                enriched_subjects=enriched,
            )
            for t in new_tasks:
                db.session.add(t)

        plan.subjects = enriched
        plan.ai_insights = self._build_insights(
            enriched, new_allocation, stress_level=5.0
        )
        plan.updated_at = datetime.now(timezone.utc)
        db.session.commit()
        logger.info("Plan %s adapted successfully", plan_id)
        return plan

    def get_plan_stats(self, plan_id: int) -> dict:
        plan = db.session.get(StudyPlan, plan_id)
        if plan is None:
            raise StudyPlanValidationError(f"Plan {plan_id} not found")

        all_tasks = []
        for wp in plan.weekly_plans:
            all_tasks.extend(wp.daily_tasks)

        total = len(all_tasks)
        completed = sum(1 for t in all_tasks if t.status == TaskStatus.COMPLETED)
        in_progress = sum(
            1 for t in all_tasks if t.status == TaskStatus.IN_PROGRESS
        )
        pending = sum(1 for t in all_tasks if t.status == TaskStatus.PENDING)
        skipped = sum(1 for t in all_tasks if t.status == TaskStatus.SKIPPED)

        total_estimated = sum(t.estimated_minutes for t in all_tasks)
        total_actual = sum(t.actual_minutes for t in all_tasks)

        subject_stats: dict[str, dict] = {}
        for task in all_tasks:
            s = subject_stats.setdefault(
                task.subject_name,
                {
                    "total": 0,
                    "completed": 0,
                    "estimated_minutes": 0,
                    "actual_minutes": 0,
                },
            )
            s["total"] += 1
            if task.status == TaskStatus.COMPLETED:
                s["completed"] += 1
            s["estimated_minutes"] += task.estimated_minutes
            s["actual_minutes"] += task.actual_minutes

        return {
            "plan_id": plan_id,
            "overall_progress": plan.overall_progress,
            "task_summary": {
                "total": total,
                "completed": completed,
                "in_progress": in_progress,
                "pending": pending,
                "skipped": skipped,
                "completion_rate": round(completed / total * 100, 1) if total else 0,
            },
            "time_summary": {
                "total_estimated_hours": round(total_estimated / 60, 2),
                "total_actual_hours": round(total_actual / 60, 2),
                "efficiency_ratio": round(
                    total_actual / total_estimated, 2
                ) if total_estimated else 0,
            },
            "subject_stats": subject_stats,
            "weekly_progress": [
                {
                    "week": wp.week_number,
                    "completion": wp.completion_percentage,
                    "allocated_hours": wp.allocated_hours,
                    "actual_hours": wp.actual_hours,
                }
                for wp in plan.weekly_plans
            ],
        }

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _parse_date(value: str | date) -> date:
        if isinstance(value, date):
            return value
        return datetime.strptime(value, "%Y-%m-%d").date()

    def _enrich_subjects(
        self,
        subjects: list[dict],
        academic_history: list[dict],
    ) -> list[dict]:
        """Add difficulty score, performance score, and weight hint to each subject."""
        perf_map: dict[str, list[float]] = {}
        for entry in academic_history:
            name = entry.get("subject", "").lower()
            score = float(entry.get("score", 50))
            perf_map.setdefault(name, []).append(score)

        enriched = []
        for subj in subjects:
            name = subj["name"]
            difficulty = float(
                subj.get(
                    "difficulty",
                    DIFFICULTY_MAP.get(name.lower(), DEFAULT_DIFFICULTY),
                )
            )
            scores = perf_map.get(name.lower(), [])
            avg_score = sum(scores) / len(scores) if scores else 65.0
            # Students with lower scores need more time
            performance_factor = _clamp(1.0 - (avg_score - 50) / 100)

            enriched.append(
                {
                    "name": name,
                    "credit_hours": int(subj.get("credit_hours", 3)),
                    "difficulty": difficulty,
                    "avg_score": round(avg_score, 1),
                    "performance_factor": round(performance_factor, 3),
                    "deadline": subj.get("deadline"),
                    "weight": round(difficulty * performance_factor, 4),
                }
            )
        return enriched

    def _reenrich_subjects(
        self,
        subjects: list[dict],
        subject_completion: dict[str, float],
    ) -> list[dict]:
        """Re-weight subjects based on current completion rates."""
        enriched = []
        for subj in subjects:
            completion = subject_completion.get(subj["name"], 0.0)
            # Subjects with low completion need more focus
            backlog_factor = _clamp(1.0 - completion / 100)
            enriched.append(
                {
                    **subj,
                    "weight": round(
                        subj.get("weight", 0.5) * (0.5 + 0.5 * backlog_factor), 4
                    ),
                }
            )
        return enriched

    @staticmethod
    def _compute_subject_weights(
        subjects: list[dict], stress_level: float
    ) -> dict[str, float]:
        """
        Normalise weights so they sum to 1.
        High stress → reduce overall load proportionally.
        """
        raw = {s["name"]: s.get("weight", DEFAULT_DIFFICULTY) for s in subjects}
        total = sum(raw.values()) or 1.0
        normalised = {name: w / total for name, w in raw.items()}

        # Stress modifier: at stress=10 reduce load by 20%
        stress_modifier = 1.0 - _clamp(stress_level / 10) * 0.2
        return {name: round(w * stress_modifier, 4) for name, w in normalised.items()}

    @staticmethod
    def _allocate_hours(
        weights: dict[str, float], total_weekly_hours: float
    ) -> dict[str, float]:
        """Distribute weekly hours across subjects according to weights."""
        return {
            name: round(w * total_weekly_hours, 2) for name, w in weights.items()
        }

    @staticmethod
    def _build_weekly_plan(
        plan_id: int,
        week_num: int,
        week_start: date,
        week_end: date,
        subject_hours_per_week: dict[str, float],
        enriched_subjects: list[dict],
    ) -> WeeklyPlan:
        total_hours = sum(subject_hours_per_week.values())
        return WeeklyPlan(
            study_plan_id=plan_id,
            week_number=week_num,
            start_date=week_start,
            end_date=week_end,
            allocated_hours=round(total_hours, 2),
            actual_hours=0.0,
            completion_percentage=0.0,
            subject_hours=subject_hours_per_week,
        )

    @staticmethod
    def _generate_daily_tasks(
        weekly_plan: WeeklyPlan,
        week_start: date,
        week_end: date,
        subject_hours_per_week: dict[str, float],
        enriched_subjects: list[dict],
    ) -> list[DailyTask]:
        """
        Spread tasks across the weekdays for this week.
        One session per subject per day (rotating days).
        """
        # Collect available weekdays (Mon-Fri only by default)
        available_days: list[date] = []
        current = week_start
        while current <= week_end:
            if current.weekday() < 5:  # Mon-Fri
                available_days.append(current)
            current += timedelta(days=1)

        if not available_days:
            return []

        difficulty_map = {s["name"]: s.get("difficulty", 0.5) for s in enriched_subjects}

        tasks: list[DailyTask] = []
        day_cursor = 0

        for subject_name, weekly_hours in subject_hours_per_week.items():
            if weekly_hours <= 0:
                continue
            difficulty = difficulty_map.get(subject_name, DEFAULT_DIFFICULTY)
            # Convert hours to sessions (60-90 min each depending on difficulty)
            session_minutes = 90 if difficulty >= 0.7 else 60
            sessions = max(1, round((weekly_hours * 60) / session_minutes))

            priority = TaskPriority.HIGH if difficulty >= 0.7 else TaskPriority.MEDIUM

            for session_idx in range(sessions):
                task_date = available_days[day_cursor % len(available_days)]
                day_cursor += 1
                task = DailyTask(
                    weekly_plan_id=weekly_plan.id,
                    subject_name=subject_name,
                    title=f"Study session {session_idx + 1}: {subject_name}",
                    description=(
                        f"Week {weekly_plan.week_number} – "
                        f"Session {session_idx + 1} for {subject_name}. "
                        f"Focus on key concepts and practice problems."
                    ),
                    scheduled_date=task_date,
                    estimated_minutes=session_minutes,
                    actual_minutes=0,
                    status=TaskStatus.PENDING,
                    priority=priority,
                    progress_percentage=0.0,
                    resources=[],
                )
                tasks.append(task)

        return tasks

    @staticmethod
    def _compute_subject_completion(plan: StudyPlan) -> dict[str, float]:
        """Return avg completion % per subject across all tasks."""
        totals: dict[str, list[float]] = {}
        for wp in plan.weekly_plans:
            for task in wp.daily_tasks:
                totals.setdefault(task.subject_name, []).append(
                    task.progress_percentage
                )
        return {
            name: round(sum(vals) / len(vals), 2)
            for name, vals in totals.items()
            if vals
        }

    @staticmethod
    def _build_insights(
        enriched: list[dict],
        allocation: dict[str, float],
        stress_level: float,
    ) -> dict:
        """Build human-readable AI insights dict stored on the plan."""
        weak_subjects = [
            s["name"]
            for s in enriched
            if s.get("avg_score", 65) < 50
        ]
        high_difficulty = [
            s["name"]
            for s in enriched
            if s.get("difficulty", 0.5) >= 0.75
        ]
        recommendations: list[str] = []

        if weak_subjects:
            recommendations.append(
                f"Prioritise revision for: {', '.join(weak_subjects)} "
                "where past performance was below 50%."
            )
        if high_difficulty:
            recommendations.append(
                f"Allocate longer, uninterrupted sessions for: "
                f"{', '.join(high_difficulty)} (high difficulty)."
            )
        if stress_level >= 7:
            recommendations.append(
                "High stress detected. Consider breaking study sessions "
                "into shorter 25-minute Pomodoro intervals with regular breaks."
            )

        # Use sorted() for a deterministic result when multiple subjects share the max
        top_subject = (
            sorted(allocation, key=lambda k: (-allocation[k], k))[0]
            if allocation
            else None
        )

        return {
            "weak_subjects": weak_subjects,
            "high_difficulty_subjects": high_difficulty,
            "top_allocated_subject": top_subject,
            "recommendations": recommendations,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
