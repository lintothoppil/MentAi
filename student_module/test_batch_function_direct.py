"""
Direct function test for add_new_batch with validation logic.
Bypasses API authentication to test core business logic.
"""

import sys
sys.path.insert(0, 'd:\\mentAi\\student_module')

from models import db, Course, Batch, Student
from services.batch_service import (
    get_course_max_batches,
    validate_new_batch,
    add_new_batch
)
from app import app
from datetime import datetime

def test_add_batch_with_validation():
    """Test adding batches with full validation"""
    print("\n" + "=" * 60)
    print("TESTING add_new_batch() WITH VALIDATION")
    print("=" * 60)
    
    with app.app_context():
        # Check current state of MCA (Course ID 8)
        course = Course.query.get(8)
        if not course:
            print("❌ Course ID 8 not found!")
            return
        
        print(f"\n📚 Course: {course.name}")
        max_batches = get_course_max_batches(course.name)
        print(f"   Max concurrent batches: {max_batches}")
        
        active_batches = Batch.query.filter_by(
            course_id=course.id,
            status="active"
        ).order_by(Batch.start_year.asc()).all()
        
        print(f"   Current active batches: {len(active_batches)}")
        for batch in active_batches:
            students = Student.query.filter_by(batch_id=batch.id, status="Live").count()
            print(f"     - {batch.start_year}-{batch.end_year} (ID: {batch.id}) - {students} live students")
        
        # Test Case 1: Validate future year
        print("\n\n📌 Test 1: Validate future year (2030)")
        result = validate_new_batch(course.id, 2030)
        print(f"Allowed: {result['allowed']}")
        if not result['allowed']:
            print(f"✓ Reason: {result['reason'][:80]}...")
        
        # Test Case 2: Validate past year
        print("\n\n📌 Test 2: Validate past year (2020)")
        result = validate_new_batch(course.id, 2020)
        print(f"Allowed: {result['allowed']}")
        if not result['allowed']:
            print(f"✓ Reason: {result['reason'][:80]}...")
        
        # Test Case 3: Try to add batch for current year
        print("\n\n📌 Test 3: Add batch for current year (2026)")
        current_year = datetime.now().year
        
        # First check if 2026 batch already exists
        existing_2026 = Batch.query.filter_by(
            course_id=course.id,
            start_year=current_year
        ).first()
        
        if existing_2026:
            print(f"⚠️  Batch {current_year}-{existing_2026.end_year} already exists!")
            print(f"   Skipping creation test to avoid duplicate.")
            
            # Test duplicate detection instead
            result = validate_new_batch(course.id, current_year)
            print(f"\n   Testing duplicate detection:")
            print(f"   Allowed: {result['allowed']}")
            if not result['allowed']:
                print(f"   ✓ Correctly blocked: {result['reason'][:80]}...")
        else:
            # No 2026 batch exists, try to add one
            result = add_new_batch(
                course_id=course.id,
                start_year=current_year,
                end_year=current_year + 2,  # Will be adjusted by function
                department="Department of Computer Applications"
            )
            
            print(f"Result: {result}")
            
            if "error" in result:
                print(f"\n⚠️  Error: {result['error']}")
                if "reason" in result:
                    print(f"   Reason: {result['reason']}")
            elif "success" in result:
                print(f"\n✅ SUCCESS!")
                print(f"   New batch: {result['new_batch']}")
                print(f"   Promoted to alumni: {len(result.get('promoted_to_alumni', []))} students")
                if result.get('oldest_batch_completed'):
                    print(f"   Oldest batch completed: ID {result['oldest_batch_completed']}")
                
                # Verify the new batch was created
                new_batch = Batch.query.filter_by(
                    course_id=course.id,
                    start_year=current_year
                ).first()
                
                if new_batch:
                    print(f"   ✓ Verified: New batch exists in database")
                    print(f"     Batch: {new_batch.start_year}-{new_batch.end_year}")
                    print(f"     Status: {new_batch.status}")
        
        # Test Case 4: Check what happens at capacity
        print(f"\n\n📌 Test 4: Capacity analysis")
        print(f"   Max batches allowed: {max_batches}")
        print(f"   Current active batches: {len(active_batches)}")
        
        if len(active_batches) >= max_batches:
            print(f"   ⚠️  AT CAPACITY - Next batch addition will trigger promotion!")
            
            # Show which batch would be promoted
            oldest = active_batches[0]
            student_count = Student.query.filter_by(
                batch_id=oldest.id,
                status="Live"
            ).count()
            
            print(f"   Oldest batch to be promoted: {oldest.start_year}-{oldest.end_year}")
            print(f"   Students affected: {student_count}")
        else:
            slots_available = max_batches - len(active_batches)
            print(f"   ✅ {slots_available} slot(s) available before promotion needed")

if __name__ == "__main__":
    print("=" * 60)
    print("BATCH ADDITION & VALIDATION DIRECT TEST")
    print("=" * 60)
    
    test_add_batch_with_validation()
    
    print("\n" + "=" * 60)
    print("TEST COMPLETE")
    print("=" * 60)
