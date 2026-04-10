import unittest
import os
import json
from datetime import date, timedelta
from app import app, db
from models import Student, StudentAnalytics, WeeklyStudyPlan, StudyPlanSubject, StudySessionLog, MentorIntervention, InterventionOutcome, Faculty, Subject

class MentAiAutomatedTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Use an in-memory or temp sqlite for testing
        cls.test_db_path = 'test_mentorai.db'
        app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{cls.test_db_path}'
        app.config['TESTING'] = True
        cls.client = app.test_client()
        
        with app.app_context():
            db.drop_all()
            db.create_all()
            # Seed basic structure
            from models import Course, Semester
            c = Course(name='B.Tech')
            db.session.add(c)
            db.session.commit() # Commit to get ID
            
            s_obj = Semester(name='Semester 1')
            db.session.add(s_obj)
            db.session.commit()

            mentor = Faculty(username='test_mentor', password_hash='hash', name='Test Mentor', designation='Professor', status='Live', department='CS')
            db.session.add(mentor)
            db.session.commit()
            
            sub = Subject(name='Data Structures', course_id=c.id, semester_id=s_obj.id)
            db.session.add(sub)
            db.session.commit()
            
            student = Student(admission_number='A001', full_name='Test Student', mentor_id=mentor.id, status='Live', email='test@gmail.com')
            db.session.add(student)
            db.session.commit()

    @classmethod
    def tearDownClass(cls):
        if os.path.exists(cls.test_db_path):
            os.remove(cls.test_db_path)

    def test_01_analytics_generation(self):
        """Test if calculate_analytics runs without crashing and generates base risk."""
        from app import calculate_analytics
        with app.app_context():
            metrics = calculate_analytics('A001')
            self.assertIn('risk_score', metrics)
            self.assertIn('adjusted_risk', metrics)
            
            sa = StudentAnalytics.query.filter_by(student_id='A001').first()
            self.assertIsNotNone(sa)
            self.assertEqual(sa.adjusted_risk, (sa.risk_score + sa.ml_risk_probability) / 2.0)

    def test_02_compliance_logic(self):
        """Test if compliance affects adjusted risk correctly (Phase 5)."""
        with app.app_context():
            from models import Subject
            sub = Subject.query.first()
            today = date.today()
            start = today - timedelta(days=today.weekday())
            end = start + timedelta(days=6)
            
            # Create a plan
            plan = WeeklyStudyPlan(student_id='A001', week_start=start, week_end=end, total_hours=10)
            db.session.add(plan)
            db.session.flush()
            
            ps = StudyPlanSubject(plan_id=plan.id, subject_id=sub.id, allocated_hours=10, weakness_score=50)
            db.session.add(ps)
            db.session.flush()
            
            # Log 9 hours (90% compliance -> -0.05 modifier)
            log = StudySessionLog(plan_subject_id=ps.id, date=today, hours_completed=9)
            db.session.add(log)
            db.session.commit()
            
            from app import calculate_analytics
            calculate_analytics('A001')
            
            sa = StudentAnalytics.query.filter_by(student_id='A001').first()
            self.assertEqual(sa.compliance_modifier, -0.05)
            # Original risk was roughly 50 (seed default), mod -0.05 should reduce it
            expected_base = (sa.risk_score + sa.ml_risk_probability) / 2.0
            self.assertLess(sa.adjusted_risk, expected_base + 0.1)

    def test_03_intervention_creation(self):
        """Test endpoint for creating intervention (Phase 6)."""
        with app.app_context():
            from models import Faculty
            mentor = Faculty.query.filter_by(username='test_mentor').first()
            mentor_id = mentor.id

        payload = {
            "student_id": "A001",
            "mentor_id": mentor_id,
            "intervention_type": "Academic Counseling",
            "notes": "Testing automated intervention"
        }
        response = self.client.post('/api/intervention/create', 
                                    data=json.dumps(payload), 
                                    content_type='application/json')
        self.assertEqual(response.status_code, 200)
        
        with app.app_context():
            interv = MentorIntervention.query.filter_by(student_id='A001').first()
            self.assertIsNotNone(interv)
            self.assertEqual(interv.intervention_type, "Academic Counseling")

    def test_04_outcome_evaluation(self):
        """Test if intervention outcome is computed after one week (Phase 7)."""
        with app.app_context():
            from models import Faculty
            mentor = Faculty.query.filter_by(username='test_mentor').first()
            mentor_id = mentor.id

            # Mock an intervention from EXACTLY last week
            today = date.today()
            curr_start = today - timedelta(days=today.weekday())
            prev_start = curr_start - timedelta(days=7)
            
            # Clear previous and add past
            MentorIntervention.query.delete()
            interv = MentorIntervention(
                student_id='A001',
                mentor_id=mentor_id,
                week_start=prev_start,
                risk_snapshot=80.0,
                compliance_snapshot=10.0,
                intervention_type="Warning Issued",
                notes="Past intervention"
            )
            db.session.add(interv)
            db.session.commit()
            
            # Run analytics for current week
            from app import calculate_analytics
            calculate_analytics('A001')
            
            outcome = InterventionOutcome.query.filter_by(intervention_id=interv.id).first()
            self.assertIsNotNone(outcome)
            self.assertEqual(outcome.initial_risk, 80.0)
            self.assertTrue(outcome.outcome_label in ["Improved", "Static", "Regressed"])

if __name__ == '__main__':
    unittest.main()
