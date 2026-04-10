"""Quick fix for NULL batch strings"""
import sys
sys.path.insert(0, 'd:\\mentAi\\student_module')

from models import db, Student, Batch
from app import app

print("Starting fix...")

with app.app_context():
    # Get students with NULL batch but have batch_id
    null_batch_students = Student.query.filter(
        Student.batch == None,
        Student.batch_id != None
    ).limit(10).all()
    
    print(f"Found {len(null_batch_students)} students to fix")
    
    for s in null_batch_students:
        batch = Batch.query.get(s.batch_id)
        if batch:
            s.batch = f"{batch.start_year}-{batch.end_year}"
            print(f"Fixed {s.admission_number}: {s.batch}")
    
    db.session.commit()
    print("Done!")
