import os
import sys

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def check_duplicates():
    from app import app, db
    from models import Faculty
    
    with app.app_context():
        faculty = Faculty.query.all()
        print("--- Faculty Members ---")
        for f in faculty:
            print(f"ID: {f.id} | Name: {f.name} | Username: {f.username} | Dept: {f.department} | Desig: {f.designation}")
        
        # Check for departments with 0 members if there is a Department table
        try:
            from models import Department
            depts = Department.query.all()
            print("\n--- Departments ---")
            for d in depts:
                count = Faculty.query.filter_by(department=d.name).count()
                print(f"ID: {d.id} | Name: {d.name} | Faculty Count: {count}")
        except ImportError:
            # Fallback if no Department table exists
            depts = db.session.query(Faculty.department).distinct().all()
            print("\n--- Distinct Departments in Faculty table ---")
            for d in depts:
                count = Faculty.query.filter_by(department=d[0]).count()
                print(f"Name: {d[0]} | Faculty Count: {count}")

if __name__ == "__main__":
    check_duplicates()
