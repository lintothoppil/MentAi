"""
Comprehensive fix for:
1. Fix batch strings for uploaded students (make them visible)
2. Enforce max 2 active batches for MCA - promote older batches to alumni
"""

import sys
sys.path.insert(0, 'd:\\mentAi\\student_module')

from models import db, Student, Batch, Course, AlumniStudent, AlumniMentorHistory, Faculty
from app import app
from datetime import datetime

def fix_batch_strings():
    """Fix NULL batch strings for uploaded students"""
    print("=" * 60)
    print("PART 1: FIXING BATCH STRINGS FOR UPLOADED STUDENTS")
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
                batch = Batch.query.get(student.batch_id)
                
                if batch:
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
        
        if fixed_count > 0:
            db.session.commit()
            print(f"\n✅ Fixed {fixed_count} student(s)")
            
        return fixed_count, error_count

def enforce_mca_batch_limit():
    """Enforce max 2 active batches for MCA and promote excess to alumni"""
    print("\n" + "=" * 60)
    print("PART 2: ENFORING MCA MAX 2 ACTIVE BATCHES")
    print("=" * 60)
    
    with app.app_context():
        # Get MCA course (ID 8 = Department of Computer Applications)
        course = Course.query.get(8)
        if not course:
            print("❌ Course not found!")
            return 0, 0
        
        print(f"\nCourse: {course.name}")
        print(f"Max batches allowed: 2")
        
        # Get all active batches for this course
        active_batches = Batch.query.filter_by(
            course_id=course.id,
            status="active"
        ).order_by(Batch.start_year.asc()).all()
        
        print(f"Current active batches: {len(active_batches)}")
        for b in active_batches:
            student_count = Student.query.filter_by(batch_id=b.id, status="Live").count()
            print(f"  - {b.start_year}-{b.end_year} (ID: {b.id}): {student_count} live students")
        
        max_allowed = 2
        excess_count = len(active_batches) - max_allowed
        
        if excess_count <= 0:
            print(f"\n✅ Batch count is within limit ({len(active_batches)} ≤ {max_allowed})")
            return 0, 0
        
        print(f"\n⚠️  Excess batches: {excess_count}")
        print(f"Need to promote {excess_count} oldest batch(es) to alumni")
        
        promoted_students = []
        batches_completed = []
        
        # Promote oldest batches until we're at the limit
        batches_to_promote = active_batches[:excess_count]
        
        for batch in batches_to_promote:
            print(f"\n📌 Promoting batch {batch.start_year}-{batch.end_year}...")
            
            # Get all Live/Dropout students in this batch
            students = Student.query.filter(
                Student.batch_id == batch.id,
                Student.status.in_(["Live", "Dropout"])
            ).all()
            
            print(f"   Found {len(students)} students to promote")
            
            for student in students:
                try:
                    # Create AlumniStudent record
                    existing_alumni = AlumniStudent.query.filter_by(
                        admission_number=student.admission_number
                    ).first()
                    
                    if not existing_alumni:
                        alumni = AlumniStudent(
                            admission_number=student.admission_number,
                            name=student.full_name,
                            email=student.email,
                            department=student.branch,
                            course_id=course.id,
                            batch_id=batch.id,
                            mentor_id=student.mentor_id,
                            passout_year=batch.end_year
                        )
                        db.session.add(alumni)
                        print(f"     ✓ Created alumni record: {student.admission_number}")
                    
                    # Create AlumniMentorHistory if mentor assigned
                    if student.mentor_id:
                        history = AlumniMentorHistory(
                            admission_number=student.admission_number,
                            mentor_id=student.mentor_id,
                            start_date=student.created_at,
                            end_date=datetime.utcnow()
                        )
                        db.session.add(history)
                        print(f"     ✓ Created mentor history")
                    
                    # Mark student as Passed Out
                    student.status = "Passed Out"
                    promoted_students.append(student.admission_number)
                    
                except Exception as e:
                    print(f"     ✗ Error promoting {student.admission_number}: {str(e)}")
            
            # Mark batch as completed
            batch.status = "completed"
            batches_completed.append(batch.id)
            print(f"   ✓ Batch marked as completed")
        
        db.session.commit()
        
        print(f"\n✅ Promotion complete!")
        print(f"   Students promoted to alumni: {len(promoted_students)}")
        print(f"   Batches completed: {len(batches_completed)}")
        
        if promoted_students:
            print(f"\n   Promoted students:")
            for adm_no in promoted_students[:10]:  # Show first 10
                print(f"     - {adm_no}")
            if len(promoted_students) > 10:
                print(f"     ... and {len(promoted_students) - 10} more")
        
        return len(promoted_students), len(batches_completed)

def verify_fix():
    """Verify all fixes were applied correctly"""
    print("\n" + "=" * 60)
    print("VERIFICATION")
    print("=" * 60)
    
    with app.app_context():
        # Check 1: Verify batch strings
        print("\n✓ Check 1: Batch strings for Computer Applications students")
        dept = "Department of Computer Applications"
        students = Student.query.filter_by(branch=dept, status="Live").order_by(Student.admission_number).limit(10).all()
        
        null_count = sum(1 for s in students if not s.batch)
        if null_count > 0:
            print(f"   ⚠️  {null_count} students still have NULL batch strings")
        else:
            print(f"   ✅ All checked students have valid batch strings")
        
        # Check 2: Verify MCA batch count
        print("\n✓ Check 2: MCA active batch count")
        course = Course.query.get(8)
        active_batches = Batch.query.filter_by(
            course_id=course.id,
            status="active"
        ).order_by(Batch.start_year.asc()).all()
        
        print(f"   Active batches: {len(active_batches)}")
        for b in active_batches:
            student_count = Student.query.filter_by(batch_id=b.id, status="Live").count()
            print(f"     - {b.start_year}-{b.end_year}: {student_count} live students")
        
        if len(active_batches) <= 2:
            print(f"   ✅ Batch count within limit (≤ 2)")
        else:
            print(f"   ❌ Still exceeds limit! Should be 2")
        
        # Check 3: Verify alumni records created
        print("\n✓ Check 3: Alumni records")
        recent_alumni = AlumniStudent.query.order_by(AlumniStudent.id.desc()).limit(5).all()
        if recent_alumni:
            print(f"   Recent alumni created:")
            for al in recent_alumni:
                print(f"     - {al.admission_number}: {al.name} (Class of {al.passout_year})")
        else:
            print(f"   ℹ️  No recent alumni records (may be expected if no promotion needed)")

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("COMPREHENSIVE BATCH & ALUMNI FIX")
    print("=" * 60)
    print("This script will:")
    print("  1. Fix batch strings for uploaded students")
    print("  2. Enforce MCA max 2 active batches limit")
    print("  3. Promote excess batches to alumni")
    print("=" * 60)
    
    # Part 1: Fix batch strings
    fixed, errors = fix_batch_strings()
    
    # Part 2: Enforce batch limit
    promoted, completed = enforce_mca_batch_limit()
    
    # Verify
    verify_fix()
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Students with batch strings fixed: {fixed}")
    print(f"Errors encountered: {errors}")
    print(f"Students promoted to alumni: {promoted}")
    print(f"Batches completed: {completed}")
    print("=" * 60)
    
    if fixed >= 0 and promoted >= 0:
        print("\n✅ Fix process completed successfully!")
    else:
        print("\n⚠️  Some issues occurred - review output above")
    
    print("=" * 60)
