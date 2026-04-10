"""
Fix for students uploaded via Excel who have NULL batch strings.
Updates Student.batch field based on their batch_id reference.
"""

import sys
sys.path.insert(0, 'd:\\mentAi\\student_module')

from models import db, Student, Batch
from app import app

def main():
    print("=" * 60)
    print("FIXING BATCH STRINGS FOR UPLOADED STUDENTS")
    print("=" * 60)
    
    with app.app_context():
        # Find all students with NULL or empty batch strings but have batch_id
        students_with_null_batch = Student.query.filter(
            db.or_(
                Student.batch == None,
                Student.batch == ''
            ),
            Student.batch_id != None
        ).all()
        
        print(f"\nFound {len(students_with_null_batch)} students with NULL/empty batch strings\n")
        
        fixed_count = 0
        error_count = 0
        
        for student in students_with_null_batch:
            try:
                # Get the batch record
                batch = Batch.query.get(student.batch_id)
                
                if batch:
                    # Update the batch string to match the batch record
                    old_batch = student.batch if student.batch else "(NULL)"
                    student.batch = f"{batch.start_year}-{batch.end_year}"
                    
                    print(f"✓ {student.admission_number}: {old_batch} → {student.batch}")
                    fixed_count += 1
                else:
                    print(f"⚠ {student.admission_number}: Batch ID {student.batch_id} not found!")
                    error_count += 1
                    
            except Exception as e:
                print(f"✗ Error updating {student.admission_number}: {str(e)}")
                error_count += 1
        
        # Commit changes
        if fixed_count > 0:
            db.session.commit()
            print(f"\n✅ Successfully updated {fixed_count} student(s)")
        else:
            print(f"\nℹ️  No students needed updating")
            
        if error_count > 0:
            print(f"⚠️  {error_count} error(s) encountered")
        
        # Verification
        print("\n" + "=" * 60)
        print("VERIFICATION")
        print("=" * 60)
        
        # Check Computer Applications students specifically
        dept = "Department of Computer Applications"
        students = Student.query.filter_by(branch=dept, status="Live").order_by(Student.admission_number).limit(15).all()
        
        print(f"\n{dept} Students (First 15):")
        print("-" * 60)
        
        null_count = 0
        for s in students:
            batch_str = s.batch if s.batch else "NULL"
            batch_id_str = str(s.batch_id) if s.batch_id else "NULL"
            status_icon = "✓" if s.batch else "✗"
            
            if not s.batch:
                null_count += 1
            
            print(f"{status_icon} {s.admission_number}: {s.full_name:30} | Batch: {batch_str:12} | ID: {batch_id_str}")
        
        if null_count > 0:
            print(f"\n⚠️  {null_count} students still have NULL batch strings")
            return False
        else:
            print(f"\n✅ All checked students have valid batch strings!")
            return True

if __name__ == "__main__":
    success = main()
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    if success:
        print("✅ Fix completed successfully!")
    else:
        print("⚠️  Some students still need attention")
    print("=" * 60)
