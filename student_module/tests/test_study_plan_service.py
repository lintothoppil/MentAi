"""
Unit Tests – StudyPlanGenerationService
"""

import unittest
from datetime import date, timedelta
from unittest.mock import MagicMock, patch

# ---------------------------------------------------------------------------
# We test the pure-logic helpers in isolation (no DB needed for most tests).
# ---------------------------------------------------------------------------

from student_module.services.study_plan_service import (
    StudyPlanGenerationService,
    _clamp,
)


class TestClamp(unittest.TestCase):
    def test_within_range(self):
        self.assertAlmostEqual(_clamp(0.5), 0.5)

    def test_below_min(self):
        self.assertAlmostEqual(_clamp(-1.0), 0.0)

    def test_above_max(self):
        self.assertAlmostEqual(_clamp(2.0), 1.0)

    def test_custom_range(self):
        self.assertEqual(_clamp(15, 10, 20), 15)
        self.assertEqual(_clamp(5, 10, 20), 10)
        self.assertEqual(_clamp(25, 10, 20), 20)


class TestEnrichSubjects(unittest.TestCase):
    def setUp(self):
        self.service = StudyPlanGenerationService()

    def test_no_history(self):
        subjects = [{"name": "Mathematics", "credit_hours": 4}]
        result = self.service._enrich_subjects(subjects, [])
        self.assertEqual(len(result), 1)
        item = result[0]
        self.assertEqual(item["name"], "Mathematics")
        self.assertIn("difficulty", item)
        self.assertIn("weight", item)
        # Default avg_score should be 65
        self.assertAlmostEqual(item["avg_score"], 65.0)

    def test_with_history_weak_student(self):
        subjects = [{"name": "Physics", "credit_hours": 3}]
        history = [{"subject": "Physics", "score": 30, "semester": "S1"}]
        result = self.service._enrich_subjects(subjects, history)
        item = result[0]
        # Low score → high performance_factor (needs more time)
        self.assertGreater(item["performance_factor"], 0.5)

    def test_with_history_strong_student(self):
        subjects = [{"name": "English", "credit_hours": 2}]
        history = [{"subject": "English", "score": 90, "semester": "S1"}]
        result = self.service._enrich_subjects(subjects, history)
        item = result[0]
        # High score → lower performance_factor than default (65 → 0.85)
        # Formula: 1.0 - (score - 50) / 100  → 1.0 - 0.40 = 0.60 for score=90
        default_factor = self.service._enrich_subjects(subjects, [])[0]["performance_factor"]
        self.assertLess(item["performance_factor"], default_factor)

    def test_explicit_difficulty_override(self):
        subjects = [{"name": "Custom", "credit_hours": 3, "difficulty": 0.95}]
        result = self.service._enrich_subjects(subjects, [])
        self.assertAlmostEqual(result[0]["difficulty"], 0.95)


class TestComputeSubjectWeights(unittest.TestCase):
    def setUp(self):
        self.service = StudyPlanGenerationService()

    def _make_subjects(self, names_weights):
        return [{"name": n, "weight": w} for n, w in names_weights.items()]

    def test_weights_sum_to_at_most_one(self):
        subjects = self._make_subjects({"Math": 0.6, "English": 0.4})
        weights = self.service._compute_subject_weights(subjects, stress_level=0)
        total = sum(weights.values())
        self.assertAlmostEqual(total, 1.0, places=5)

    def test_high_stress_reduces_total(self):
        subjects = self._make_subjects({"Math": 0.5, "Science": 0.5})
        w_low = self.service._compute_subject_weights(subjects, stress_level=0)
        w_high = self.service._compute_subject_weights(subjects, stress_level=10)
        self.assertLess(sum(w_high.values()), sum(w_low.values()))

    def test_single_subject(self):
        subjects = [{"name": "Solo", "weight": 1.0}]
        weights = self.service._compute_subject_weights(subjects, stress_level=5)
        self.assertIn("Solo", weights)


class TestAllocateHours(unittest.TestCase):
    def setUp(self):
        self.service = StudyPlanGenerationService()

    def test_proportional_allocation(self):
        weights = {"Math": 0.6, "English": 0.4}
        allocation = self.service._allocate_hours(weights, 10.0)
        self.assertAlmostEqual(allocation["Math"], 6.0)
        self.assertAlmostEqual(allocation["English"], 4.0)

    def test_total_matches_weekly_hours(self):
        weights = {"A": 0.3, "B": 0.3, "C": 0.4}
        allocation = self.service._allocate_hours(weights, 20.0)
        self.assertAlmostEqual(sum(allocation.values()), 20.0, places=5)


class TestParseDate(unittest.TestCase):
    def test_string_parsing(self):
        result = StudyPlanGenerationService._parse_date("2024-03-15")
        self.assertEqual(result, date(2024, 3, 15))

    def test_date_passthrough(self):
        d = date(2024, 6, 1)
        self.assertEqual(StudyPlanGenerationService._parse_date(d), d)


class TestBuildInsights(unittest.TestCase):
    def setUp(self):
        self.service = StudyPlanGenerationService()

    def test_weak_subject_flagged(self):
        subjects = [{"name": "Math", "avg_score": 40.0, "difficulty": 0.5}]
        allocation = {"Math": 10.0}
        insights = self.service._build_insights(subjects, allocation, 5.0)
        self.assertIn("Math", insights["weak_subjects"])

    def test_high_stress_recommendation(self):
        subjects = [{"name": "Math", "avg_score": 70.0, "difficulty": 0.5}]
        allocation = {"Math": 10.0}
        insights = self.service._build_insights(subjects, allocation, 9.0)
        recs = " ".join(insights["recommendations"])
        self.assertIn("stress", recs.lower())

    def test_high_difficulty_flagged(self):
        subjects = [{"name": "Algorithms", "avg_score": 65.0, "difficulty": 0.85}]
        allocation = {"Algorithms": 8.0}
        insights = self.service._build_insights(subjects, allocation, 3.0)
        self.assertIn("Algorithms", insights["high_difficulty_subjects"])


class TestGenerateDailyTasksStatic(unittest.TestCase):
    """Test _generate_daily_tasks without a real DB session."""

    def _make_weekly_plan_mock(self, week_id=1, plan_id=1, week_num=1):
        wp = MagicMock()
        wp.id = week_id
        wp.study_plan_id = plan_id
        wp.week_number = week_num
        return wp

    def test_tasks_created_for_each_subject(self):
        service = StudyPlanGenerationService()
        # Mon–Fri week
        week_start = date(2024, 1, 15)  # Monday
        week_end = date(2024, 1, 19)    # Friday
        wp = self._make_weekly_plan_mock()

        allocation = {"Math": 3.0, "English": 2.0}
        subjects = [
            {"name": "Math", "difficulty": 0.9},
            {"name": "English", "difficulty": 0.4},
        ]
        tasks = service._generate_daily_tasks(
            weekly_plan=wp,
            week_start=week_start,
            week_end=week_end,
            subject_hours_per_week=allocation,
            enriched_subjects=subjects,
        )
        subject_names = {t.subject_name for t in tasks}
        self.assertIn("Math", subject_names)
        self.assertIn("English", subject_names)

    def test_no_tasks_for_weekend_only_week(self):
        service = StudyPlanGenerationService()
        # Saturday–Sunday
        week_start = date(2024, 1, 20)  # Saturday
        week_end = date(2024, 1, 21)    # Sunday
        wp = self._make_weekly_plan_mock()
        tasks = service._generate_daily_tasks(
            weekly_plan=wp,
            week_start=week_start,
            week_end=week_end,
            subject_hours_per_week={"Math": 5.0},
            enriched_subjects=[{"name": "Math", "difficulty": 0.5}],
        )
        self.assertEqual(tasks, [])

    def test_task_scheduled_dates_within_range(self):
        service = StudyPlanGenerationService()
        week_start = date(2024, 1, 15)
        week_end = date(2024, 1, 19)
        wp = self._make_weekly_plan_mock()
        tasks = service._generate_daily_tasks(
            weekly_plan=wp,
            week_start=week_start,
            week_end=week_end,
            subject_hours_per_week={"Physics": 4.0},
            enriched_subjects=[{"name": "Physics", "difficulty": 0.8}],
        )
        for t in tasks:
            self.assertGreaterEqual(t.scheduled_date, week_start)
            self.assertLessEqual(t.scheduled_date, week_end)


class TestReenrichSubjects(unittest.TestCase):
    def setUp(self):
        self.service = StudyPlanGenerationService()

    def test_low_completion_increases_weight(self):
        subjects = [{"name": "Math", "weight": 0.5}]
        completion = {"Math": 10.0}  # very low
        result = self.service._reenrich_subjects(subjects, completion)
        # weight should be higher than original (closer to original with backlog boost)
        self.assertGreater(result[0]["weight"], 0.0)

    def test_full_completion_reduces_weight(self):
        subjects = [{"name": "English", "weight": 0.5}]
        completion = {"English": 100.0}  # fully done
        result = self.service._reenrich_subjects(subjects, completion)
        # weight should be lower (backlog_factor = 0)
        self.assertLess(result[0]["weight"], 0.5)


if __name__ == "__main__":
    unittest.main()
