import os
import sys

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def check_faculty_refs():
    from app import app, db
    from models import Faculty, Student, SubjectAllocation, InternalMark, Alert, MentorIntervention
    
    with app.app_context():
        f_id = 1
        f = Faculty.query.get(f_id)
        if not f:
            print("Faculty ID 1 not found.")
            return
            
        print(f"Checking references for Faculty ID {f_id} ({f.name}, Dept: {f.department})")
        
        mentees = Student.query.filter_by(mentor_id=f_id).count()
        print(f"Mentees: {mentees}")
        
        allocs = SubjectAllocation.query.filter_by(faculty_id=f_id).count()
        print(f"Subject Allocations: {allocs}")
        
        marks = InternalMark.query.filter_by(uploaded_by=f_id).count()
        print(f"Internal Marks Uploaded: {marks}")
        
        alerts = Alert.query.filter_by(mentor_id=f_id).count()
        print(f"Alerts: {alerts}")
        
        interventions = MentorIntervention.query.filter_by(mentor_id=f_id).count()
        print(f"Mentor Interventions: {interventions}")

if __name__ == "__main__":
    check_faculty_refs()
