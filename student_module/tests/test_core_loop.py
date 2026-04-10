import unittest
import os
import json
import sys
from datetime import date, timedelta
from flask import url_for

# Add parent directory to path to import app and models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, db
from models import (
    Student, StudentAnalytics, WeeklyStudyPlan, StudyPlanSubject, 
    StudySessionLog, MentorIntervention, InterventionOutcome, 
    Faculty, Subject, Course, Semester
)

class MentAiCoreSystemTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.test_db_path = os.path.join(os.path.dirname(__file__), 'test_system.db')
        app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{cls.test_db_path}'
        app.config['TESTING'] = True
        app.config['SERVER_NAME'] = 'localhost' # For url_for if needed
        cls.client = app.test_client()
        
        with app.app_context():
            db.drop_all()
            db.create_all()
            
            # 1. Setup Academic Structure
            course = Course(name='Computer Science')
            db.session.add(course)
            db.session.commit()
            
            sem = Semester(name='Semester 1')
            db.session.add(sem)
            db.session.commit()
            
            sub = Subject(name='Programming in C', course_id=course.id, semester_id=sem.id)
            db.session.add(sub)
            db.session.commit()
            
            # 2. Setup Human Structure
            mentor = Faculty(
                username='dr_smith', 
                password_hash='pbkdf2:sha256...', 
                name='Dr. Smith', 
                designation='Senior Professor', 
                status='Live', 
                department='CSE'
            )
            db.session.add(mentor)
            db.session.commit()
            
            student = Student(
                admission_number='S101', 
                full_name='John Doe', 
                mentor_id=mentor.id, 
                status='Live', 
                email='john@mentorai.edu'
            )
            db.session.add(student)
            db.session.commit()

    @classmethod
    def tearDownClass(cls):
        if os.path.exists(cls.test_db_path):
            os.remove(cls.test_db_path)

    def test_01_analytics_calculation(self):
        """Phase 1-4 Analysis: Ensure base metrics generate correctly."""
        with app.app_context():
            from app import calculate_analytics
            calculate_analytics('S101')
            
            sa = StudentAnalytics.query.filter_by(student_id='S101').first()
            self.assertIsNotNone(sa, "StudentAnalytics record should be created")
            self.assertTrue(0 <= sa.risk_score <= 100, "Risk score should be bounded 0-100")
            self.assertTrue(0 <= sa.ml_risk_probability <= 100, "ML probability should be bounded 0-100")

    def test_02_phase5_compliance_modulation(self):
        """Phase 5: Test risk modulation based on study plan adherence."""
        with app.app_context():
            today = date.today()
            monday = today - timedelta(days=today.weekday())
            
            # Setup a plan
            plan = WeeklyStudyPlan(student_id='S101', week_start=monday, week_end=monday+timedelta(days=6), total_hours=10)
            db.session.add(plan)
            db.session.flush()
            
            sub = Subject.query.first()
            ps = StudyPlanSubject(plan_id=plan.id, subject_id=sub.id, allocated_hours=10, weakness_score=80)
            db.session.add(ps)
            db.session.flush()
            
            # Scenario: Low Compliance (20%) -> Should add +0.10 risk modifier
            log = StudySessionLog(plan_subject_id=ps.id, date=today, hours_completed=2)
            db.session.add(log)
            db.session.commit()
            
            from app import calculate_analytics
            calculate_analytics('S101')
            
            sa = StudentAnalytics.query.filter_by(student_id='S101').first()
            self.assertEqual(sa.compliance_modifier, 0.10, "Modifier should be +0.10 for low compliance")
            
            # Verify adjusted risk is higher than base combo
            base_combo = (sa.risk_score + sa.ml_risk_probability) / 2.0
            self.assertGreater(sa.adjusted_risk, base_combo, "Adjusted risk must be inflated for low compliance")

    def test_03_phase6_mentor_intervention(self):
        """Phase 6: Test mentor action logging and snapshots."""
        with app.app_context():
            mentor = Faculty.query.filter_by(username='dr_smith').first()
            sa = StudentAnalytics.query.filter_by(student_id='S101').first()
            risk_before = sa.adjusted_risk

        payload = {
            "student_id": "S101",
            "mentor_id": mentor.id,
            "intervention_type": "Warning Issued",
            "notes": "Student is not following the study plan."
        }
        
        response = self.client.post('/api/intervention/create', 
                                    data=json.dumps(payload), 
                                    content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        
        with app.app_context():
            interv = MentorIntervention.query.filter_by(student_id='S101').first()
            self.assertIsNotNone(interv)
            self.assertEqual(interv.risk_snapshot, risk_before, "Snapshots must preserve adjusted_risk at log time")
            self.assertEqual(interv.intervention_type, "Warning Issued")

    def test_04_phase7_causal_outcome_tracking(self):
        """Phase 7: Test automated evaluation of a past intervention."""
        with app.app_context():
            mentor = Faculty.query.filter_by(username='dr_smith').first()
            
            # 1. Mock an intervention from EXACTLY last week
            today = date.today()
            this_monday = today - timedelta(days=today.weekday())
            last_monday = this_monday - timedelta(days=7)
            
            # Clean up prev interventions for this test
            MentorIntervention.query.delete()
            
            # Setup intervention with high risk snapshot (85.0)
            interv = MentorIntervention(
                student_id='S101',
                mentor_id=mentor.id,
                week_start=last_monday,
                risk_snapshot=85.0,
                compliance_snapshot=10.0,
                intervention_type="Academic Counseling",
                notes="Past counseling session"
            )
            db.session.add(interv)
            db.session.commit()
            
            # 2. Simulate current week analytics (S101 risk is low ~50)
            from app import calculate_analytics
            calculate_analytics('S101')
            
            # 3. Verify outcome record exists
            outcome = InterventionOutcome.query.filter_by(intervention_id=interv.id).first()
            self.assertIsNotNone(outcome, "Outcome should be auto-created for 1-week old intervention")
            
            # risk_snapshot (85) vs current risk (~50) -> Delta should be around -35
            self.assertLess(outcome.delta, -20, "Delta should reflect the significant reduction in risk")
            self.assertEqual(outcome.outcome_label, "Improved", "Result should be labeled Improved")

if __name__ == '__main__':
    unittest.main()
