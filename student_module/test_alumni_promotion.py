"""
Test script for alumni promotion and batch validation logic.
Tests the new implementation in batch_service.py
"""

import sys
sys.path.insert(0, 'd:\\mentAi\\student_module')

from models import db, Course, Batch, Student, Faculty, AlumniStudent, AlumniMentorHistory
from services.batch_service import (
    get_course_max_batches,
    validate_new_batch,
    add_new_batch
)
from app import app
from datetime import datetime

def test_get_course_max_batches():
    """Test max batches calculation for different courses"""
    print("\n" + "=" * 60)
    print("TEST: get_course_max_batches()")
    print("=" * 60)
    
    test_cases = [
        ("IMCA", 5, "IMCA should allow 5 batches"),
        ("imca", 5, "IMCA lowercase should allow 5 batches"),
        ("MCA", 2, "MCA should allow 2 batches"),
        ("mca", 2, "MCA lowercase should allow 2 batches"),
        ("MBA", 2, "MBA should allow 2 batches"),
        ("mba", 2, "MBA lowercase should allow 2 batches"),
        ("B.Tech", 4, "B.Tech should allow 4 batches"),
        ("Btech", 4, "Btech should allow 4 batches"),
        ("B.E", 4, "B.E should allow 4 batches"),
        ("Engineering", 4, "Engineering should allow 4 batches"),
        ("M.Tech", 4, "M.Tech should allow 4 batches"),
        ("Unknown Course", 4, "Unknown course defaults to 4 batches"),
    ]
    
    all_passed = True
    for course_name, expected, description in test_cases:
        result = get_course_max_batches(course_name)
        status = "✓" if result == expected else "✗"
        print(f"{status} {description}: {result} (expected {expected})")
        if result != expected:
            all_passed = False
    
    return all_passed

def test_validate_new_batch():
    """Test batch validation logic"""
    print("\n" + "=" * 60)
    print("TEST: validate_new_batch()")
    print("=" * 60)
    
    with app.app_context():
        current_year = datetime.now().year
        
        # Test Case 1: Wrong year (future)
        print(f"\n📌 Test 1: Future year (current year is {current_year})")
        result = validate_new_batch(1, current_year + 1)
        if not result["allowed"] and "must be" in result["reason"]:
            print(f"✓ Correctly blocked future year: {result['reason'][:50]}...")
        else:
            print(f"✗ Failed to block future year")
            return False
        
        # Test Case 2: Wrong year (past)
        print(f"\n📌 Test 2: Past year")
        result = validate_new_batch(1, current_year - 1)
        if not result["allowed"] and "must be" in result["reason"]:
            print(f"✓ Correctly blocked past year: {result['reason'][:50]}...")
        else:
            print(f"✗ Failed to block past year")
            return False
        
        # Test Case 3: Valid year but gap check will fail
        print(f"\n📌 Test 3: Current year (gap validation depends on existing data)")
        result = validate_new_batch(1, current_year)
        if result["allowed"]:
            print(f"✓ Allowed current year (no existing batches or gap=1)")
        elif "already exists" in result["reason"]:
            print(f"✓ Blocked duplicate batch: {result['reason'][:50]}...")
        elif "year by year" in result["reason"]:
            print(f"✓ Blocked due to gap: {result['reason'][:50]}...")
        else:
            print(f"? Other result: {result}")
        
        return True

def test_existing_batches():
    """Check existing batches in database"""
    print("\n" + "=" * 60)
    print("EXISTING BATCHES IN DATABASE")
    print("=" * 60)
    
    with app.app_context():
        courses = Course.query.all()
        
        for course in courses:
            print(f"\n📚 Course: {course.name} (ID: {course.id})")
            max_batches = get_course_max_batches(course.name)
            print(f"   Max concurrent batches allowed: {max_batches}")
            
            active_batches = Batch.query.filter_by(
                course_id=course.id,
                status="active"
            ).order_by(Batch.start_year.asc()).all()
            
            print(f"   Active batches: {len(active_batches)}")
            for batch in active_batches:
                print(f"     - {batch.start_year}-{batch.end_year} (ID: {batch.id})")

def test_alumni_data():
    """Check existing alumni records"""
    print("\n" + "=" * 60)
    print("EXISTING ALUMNI RECORDS")
    print("=" * 60)
    
    with app.app_context():
        from services.batch_service import get_grouped_alumni
        
        grouped = get_grouped_alumni()
        
        if not grouped:
            print("No alumni records found.")
            return
        
        for dept, batches in grouped.items():
            print(f"\n📚 {dept}:")
            for batch_label, alumni_list in batches.items():
                print(f"   {batch_label}: {len(alumni_list)} alumni")
                for al in alumni_list[:3]:  # Show first 3
                    mentor_str = f" (Mentor: {al.get('mentor', 'N/A')})" if al.get('mentor') else ""
                    print(f"     - {al['admission_number']}: {al['name']}{mentor_str}")
                
                if len(alumni_list) > 3:
                    print(f"     ... and {len(alumni_list) - 3} more")

if __name__ == "__main__":
    print("=" * 60)
    print("ALUMNI PROMOTION & BATCH VALIDATION TEST SUITE")
    print("=" * 60)
    
    results = []
    
    # Test 1: Max batches calculation
    results.append(("Max Batches Calculation", test_get_course_max_batches()))
    
    # Test 2: Batch validation
    results.append(("Batch Validation", test_validate_new_batch()))
    
    # Test 3: Check existing data
    test_existing_batches()
    
    # Test 4: Check alumni
    test_alumni_data()
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    for test_name, passed in results:
        status = "✓ PASSED" if passed else "✗ FAILED"
        print(f"{status}: {test_name}")
    
    total = len(results)
    passed = sum(1 for _, p in results if p)
    
    print(f"\nTotal: {passed}/{total} automated tests passed")
    
    if passed == total:
        print("\n🎉 All core logic tests passed!")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed.")
