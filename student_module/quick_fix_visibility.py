"""
Quick fix: Make all uploaded students visible in mentor allocation.
Sets batch string for any student with NULL batch but valid batch_id.
"""

import sys
sys.path.insert(0, 'd:\\mentAi\\student_module')

from models import db, Student, Batch
from app import app

print("=" * 60)
print("QUICK FIX: BATCH STRINGS FOR UPLOADED STUDENTS")
print("=" * 60)

with app.app_context():
    # Find students with NULL batch strings
    null_students = Student.query.filter(
        db.or_(Student.batch == None, Student.batch == ''),
        Student.batch_id != None
    ).all()
    
    print(f"\nFound {len(null_students)} students to fix\n")
    
    if len(null_students) == 0:
        print("✅ All students have valid batch strings!")
    else:
        fixed = 0
        for s in null_students:
            batch = Batch.query.get(s.batch_id)
            if batch:
                s.batch = f"{batch.start_year}-{batch.end_year}"
                print(f"✓ {s.admission_number}: Set batch to '{s.batch}'")
                fixed += 1
        
        db.session.commit()
        print(f"\n✅ Fixed {fixed} student(s)")
        
        print("\nStudents can now be seen in mentor allocation!")

print("=" * 60)
