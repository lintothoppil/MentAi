import os
import sys

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def final_cleanup():
    from app import app, db
    from models import Faculty, Student, Alert, MentorIntervention, InterventionOutcome
    
    with app.app_context():
        # 1. Reassign and Delete Faculty ID 1 (CSE Duplicate)
        old_id = 1
        new_id = 2 # Arun S Nair in Computer Science and Engineering (CSE)
        
        old_f = Faculty.query.get(old_id)
        if old_f:
            print(f"Reassigning references from Faculty ID {old_id} to {new_id}...")
            
            # Update Mentees
            mentees = Student.query.filter_by(mentor_id=old_id).all()
            for s in mentees:
                s.mentor_id = new_id
            
            # Update Interventions
            interventions = MentorIntervention.query.filter_by(mentor_id=old_id).all()
            for i in interventions:
                i.mentor_id = new_id
            
            # Alerts
            alerts = Alert.query.filter_by(mentor_id=old_id).all()
            for a in alerts:
                a.mentor_id = new_id
                
            db.session.commit()
            print("References reassigned.")
            
            # Now delete the duplicate faculty
            print(f"Deleting duplicate faculty: {old_f.name}")
            db.session.delete(old_f)
            db.session.commit()
            print("Faculty ID 1 deleted.")
        else:
            print("Faculty ID 1 already gone or not found.")

        # 2. Fix Humanities Casing
        humanities = Faculty.query.filter(Faculty.department == 'BASIC SCIENCES & HUMANITIES').all()
        if humanities:
            print(f"Fixing casing for {len(humanities)} Humanities faculty...")
            for f in humanities:
                f.department = 'Basic Sciences & Humanities'
            db.session.commit()
            print("Humanities casing fixed.")

if __name__ == "__main__":
    final_cleanup()
