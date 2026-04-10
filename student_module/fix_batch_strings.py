"""
Fix for students uploaded via Excel who have NULL batch strings.
This script updates Student.batch field to match their batch_id reference.
"""

import sys
sys.path.insert(0, 'd:\\mentAi\\student_module')

from models import db, Student, Batch
from app import app

def fix_batch_strings():
    """Update NULL batch strings for students based on their batch_id"""
    
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
        
        print(f"\nFound {len(students_with_null_batch)} students with NULL batch strings")
        
        fixed_count = 0
        error_count = 0
        
        for student in students_with_null_batch:
            try:
                # Get the batch record
                batch = Batch.query.get(student.batch_id)
                
                if batch:
                    # Update the batch string to match the batch record
                    old_batch = student.batch
                    student.batch = f"{batch.start_year}-{batch.end_year}"
                    
                    print(f"✓ {student.admission_number}: '{old_batch}' → '{student.batch}'")
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
            print(f"\nNo students needed updating")
            
        if error_count > 0:
            print(f"⚠️  {error_count} error(s) encountered")
        
        return fixed_count, error_count

def verify_fix():
    """Verify that batch strings are now populated"""
    
    print("\n" + "=" * 60)
    print("VERIFICATION - CHECKING BATCH STRINGS")
    print("=" * 60)
    
    with app.app_context():
        # Check Computer Applications students
        dept = "Department of Computer Applications"
        students = Student.query.filter_by(branch=dept, status="Live").order_by(Student.admission_number).all()
        
        print(f"\n{dept} Students:")
        print("-" * 60)
        
        null_count = 0
        for s in students[:20]:  # Show first 20
            batch_str = s.batch if s.batch else "NULL"
            batch_id_str = str(s.batch_id) if s.batch_id else "NULL"
            status = "✓" if s.batch else "⚠️"
            
            if not s.batch:
                null_count += 1
            
            print(f"{status} {s.admission_number}: {s.full_name:30} | Batch: {batch_str:15} | ID: {batch_id_str}")
        
        if len(students) > 20:
            print(f"... and {len(students) - 20} more students")
        
        if null_count > 0:
            print(f"\n⚠️  {null_count} students still have NULL batch strings")
        else:
            print(f"\n✅ All students have valid batch strings!")
        
        return null_count == 0

if __name__ == "__main__":
    print("\nBATCH STRING FIX SCRIPT")
    print("=" * 60)
    
    # Step 1: Fix batch strings
    fixed, errors = fix_batch_strings()
    
    # Step 2: Verify the fix
    verified = verify_fix()
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Students fixed: {fixed}")
    print(f"Errors: {errors}")
    print(f"Verification: {'PASSED ✓' if verified else 'FAILED ✗'}")
    print("=" * 60)
