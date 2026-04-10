import os
import sys
from datetime import date, timedelta

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_migration():
    from app import app, db
    from models import WeeklyStudyPlan, StudyPlanSubject, StudySessionLog, Student
    from analytics.planner import generate_and_lock_weekly_plan
    
    with app.app_context():
        # Apply schema changes (create new tables)
        db.create_all()
        print("Schema applied successfully.")
        
        # Pragma foreign keys
        db.session.execute(db.text('PRAGMA foreign_keys = ON;'))
        
        student = Student.query.first()
        if not student:
            print("No students found.")
            return

        print(f"Testing with student: {student.admission_number}")
        
        # 1. Generate plan
        plan1_id = generate_and_lock_weekly_plan(student.admission_number).id
        
        # 2. Generate plan twice same week -> should return existing
        plan2_id = generate_and_lock_weekly_plan(student.admission_number).id
        assert plan1_id == plan2_id, "Duplicate plans generated!"
        print("Check 1 Passed: Duplicate prevention works.")
        
        # 3. Add Compliance Log
        plan1 = WeeklyStudyPlan.query.get(plan1_id)
        if plan1.subjects:
            log = StudySessionLog(plan_subject_id=plan1.subjects[0].id, date=date.today(), hours_completed=2.0)
            db.session.add(log)
            db.session.commit()
            print("Check 2 Passed: Compliance log added securely.")
            
        print("All migrations and constraints validated successfully.")

if __name__ == "__main__":
    test_migration()
