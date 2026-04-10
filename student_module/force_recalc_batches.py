from app import app, db, Student
from utils import normalize_dept_name
import re

def fix_all_batches():
    with app.app_context():
        print("Forcing recalculation of ALL student batches based on admission numbers...")
        
        students = Student.query.all()
        updates = 0
        for s in students:
             normalized = normalize_dept_name(s.branch) or ""
             year = 2024 # default guess if unparseable
             match = re.search(r'A?(\d{2})', s.admission_number)
             
             if match:
                 year = 2000 + int(match.group(1))
                 
             # Determine course duration 
             # MCA/MBA=2, IMCA=5, B.Tech=4
             duration = 4
             prefix = ""
             if "Applications" in normalized:
                 if "IMCA" in s.admission_number.upper():
                     duration = 5
                     prefix = "IMCA "
                 else:
                     duration = 2
                     prefix = "MCA "
             elif "Business" in normalized:
                 duration = 2
                 prefix = "MBA "
                 
             correct_batch = f"{prefix}{year}-{year+duration}"
             
             if getattr(s, 'batch', '') != correct_batch:
                 print(f"Student {s.admission_number} ({s.branch}): changing batch from '{s.batch}' to '{correct_batch}'")
                 s.batch = correct_batch
                 updates += 1

        try:
             db.session.commit()
             print(f"Updates successfully committed. Updated {updates} student batches.")
        except Exception as e:
             db.session.rollback()
             print(f"Error committing changes: {e}")

if __name__ == '__main__':
    fix_all_batches()
