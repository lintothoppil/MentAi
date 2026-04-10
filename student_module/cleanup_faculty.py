import os
import sys

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def cleanup_faculty():
    from app import app, db
    from models import Faculty
    from sqlalchemy import text
    
    with app.app_context():
        # 1. Delete Dr. Smith (ID 1) as requested (Duplicate/Test record)
        dr_smith = Faculty.query.get(1)
        if dr_smith and dr_smith.username == 'dr_smith':
            print(f"Deleting duplicate/test faculty: {dr_smith.name} (ID: 1, Dept: {dr_smith.department})")
            db.session.delete(dr_smith)
            db.session.commit()
            print("Successfully deleted faculty ID 1.")
        
        # 2. Normalize BASIC SCIENCES & HUMANITIES casing
        # This fixes the "0 Faculty Members" issue in the UI which expects Mixed Case
        bas_sci = Faculty.query.filter(Faculty.department == 'BASIC SCIENCES & HUMANITIES').all()
        if bas_sci:
            print(f"Updating {len(bas_sci)} records from 'BASIC SCIENCES & HUMANITIES' to 'Basic Sciences & Humanities'")
            for f in bas_sci:
                f.department = 'Basic Sciences & Humanities'
            db.session.commit()
            print("Casing alignment complete.")
            
        # 3. Double check for any other "CSE" leftovers
        cse_leftovers = Faculty.query.filter(Faculty.department == 'CSE').all()
        for f in cse_leftovers:
            print(f"Relocating leftover {f.name} from CSE to Computer Science and Engineering (CSE)")
            f.department = 'Computer Science and Engineering (CSE)'
        db.session.commit()

if __name__ == "__main__":
    cleanup_faculty()
