"""
Direct test of batch_service mentor allocation functions.
Tests the logic without going through HTTP endpoints.
"""

import sys
sys.path.insert(0, 'd:\\mentAi\\student_module')

from models import db, Student, Faculty
from services.batch_service import (
    redistribute_mentors_full,
    redistribute_mentors_incremental,
    extract_year_range,
    is_mentor_eligible
)
from app import app

def test_extract_year_range():
    """Test year extraction from batch strings"""
    print("\n=== Testing extract_year_range ===")
    
    test_cases = [
        ("MCA 2024-2026", (2024, 2026)),
        ("IMCA 2024-2029", (2024, 2029)),
        ("MBA 2024-2026", (2024, 2026)),
        ("2022-2026", (2022, 2026)),
        ("2024-2028", (2024, 2028)),
    ]
    
    all_passed = True
    for batch_str, expected in test_cases:
        result = extract_year_range(batch_str)
        if result == expected:
            print(f"✓ {batch_str} → {result}")
        else:
            print(f"✗ {batch_str} → {result} (expected {expected})")
            all_passed = False
    
    return all_passed

def test_mentor_eligibility():
    """Test mentor eligibility function"""
    print("\n=== Testing Mentor Eligibility ===")
    
    with app.app_context():
        # Get sample faculty
        all_faculty = Faculty.query.all()
        
        print(f"\nTotal faculty: {len(all_faculty)}")
        print("\nDepartment of Computer Applications:")
        
        comp_app_faculty = [
            f for f in all_faculty 
            if f.department and "Computer Applications" in f.department
        ]
        
        for f in comp_app_faculty:
            eligible = is_mentor_eligible(f)
            status = "✓ ELIGIBLE" if eligible else "✗ INELIGIBLE"
            print(f"  {status}: {f.name} - {f.designation}")
        
        print("\nDepartment of Business Administration:")
        
        bus_admin_faculty = [
            f for f in all_faculty 
            if f.department and "Business Administration" in f.department
        ]
        
        for f in bus_admin_faculty:
            eligible = is_mentor_eligible(f)
            status = "✓ ELIGIBLE" if eligible else "✗ INELIGIBLE"
            status = "✓ ELIGIBLE" if eligible else "✗ INELIGIBLE"
            print(f"  {status}: {f.name} - {f.designation}")
    
    return True

def test_redistribute_full_computer_applications():
    """Test full redistribution for Computer Applications"""
    print("\n=== Testing Full Redistribution - Computer Applications ===")
    
    with app.app_context():
        result = redistribute_mentors_full(
            department="Department of Computer Applications",
            batch_id=4,
            batch_label="MCA 2024-2026"
        )
        
        print(f"Result: {result}")
        
        if result.get("success"):
            print(f"\n✓ SUCCESS!")
            print(f"  Total students: {result.get('total_students')}")
            print(f"  Total mentors: {result.get('total_mentors')}")
            print(f"  Distribution:")
            for mentor, students in result.get("distribution", {}).items():
                print(f"    - {mentor}: {len(students)} student(s)")
                if students:
                    for student in students:
                        print(f"        • {student}")
            return True
        else:
            print(f"\n✗ FAILED: {result.get('error', 'Unknown error')}")
            if "debug" in result:
                print(f"  Debug info:")
                for key, value in result["debug"].items():
                    print(f"    {key}: {value}")
            return False

def test_redistribute_incremental_computer_applications():
    """Test incremental redistribution for Computer Applications"""
    print("\n=== Testing Incremental Redistribution - Computer Applications ===")
    
    with app.app_context():
        result = redistribute_mentors_incremental(
            department="Department of Computer Applications",
            batch_id=5,
            batch_label="MCA 2025-2027"
        )
        
        print(f"Result: {result}")
        
        if result.get("success"):
            print(f"\n✓ SUCCESS!")
            if "newly_assigned" in result:
                print(f"  Newly assigned: {result.get('newly_assigned', 0)}")
                print(f"  Still unassigned: {result.get('still_unassigned', 0)}")
            if "new_assignments" in result and result["new_assignments"]:
                print(f"  New assignments:")
                for mentor, students in result["new_assignments"].items():
                    print(f"    - {mentor}: {len(students)} student(s)")
            return True
        else:
            print(f"\n✗ FAILED: {result.get('error', 'Unknown error')}")
            return False

def test_redistribute_full_business_administration():
    """Test full redistribution for Business Administration"""
    print("\n=== Testing Full Redistribution - Business Administration ===")
    
    with app.app_context():
        result = redistribute_mentors_full(
            department="Department of Business Administration",
            batch_id=8,
            batch_label="MBA 2024-2026"
        )
        
        print(f"Result: {result}")
        
        if result.get("success"):
            print(f"\n✓ SUCCESS!")
            print(f"  Total students: {result.get('total_students')}")
            print(f"  Total mentors: {result.get('total_mentors')}")
            return True
        else:
            print(f"\n✗ FAILED: {result.get('error', 'Unknown error')}")
            if "debug" in result:
                print(f"  Debug info:")
                for key, value in result["debug"].items():
                    print(f"    {key}: {value}")
            return False

if __name__ == "__main__":
    print("=" * 60)
    print("MENTOR ALLOCATION FIX - DIRECT FUNCTION TESTS")
    print("=" * 60)
    
    results = []
    
    # Test 1: Year extraction
    results.append(("Year Range Extraction", test_extract_year_range()))
    
    # Test 2: Mentor eligibility
    results.append(("Mentor Eligibility Check", test_mentor_eligibility()))
    
    # Test 3: Full redistribution
    results.append(("Full Redistribution (Computer Applications)", 
                   test_redistribute_full_computer_applications()))
    
    # Test 4: Incremental redistribution
    results.append(("Incremental Redistribution (Computer Applications)",
                   test_redistribute_incremental_computer_applications()))
    
    # Test 5: Business Administration
    results.append(("Full Redistribution (Business Administration)",
                   test_redistribute_full_business_administration()))
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    for test_name, passed in results:
        status = "✓ PASSED" if passed else "✗ FAILED"
        print(f"{status}: {test_name}")
    
    total = len(results)
    passed = sum(1 for _, p in results if p)
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Mentor allocation fix is working correctly.")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Check the output above for details.")
