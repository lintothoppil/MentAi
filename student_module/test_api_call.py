"""
Test the actual API call that the UI makes
"""

import sys
sys.path.insert(0, 'd:\\mentAi\\student_module')

from services.batch_service import redistribute_mentors_full, redistribute_mentors_incremental
from app import app

with app.app_context():
    print("=" * 60)
    print("TESTING MENTOR ALLOCATION API")
    print("=" * 60)
    
    # Test 1: Full redistribution for Department of Computer Applications
    print("\n📌 Test 1: Full Redistribution - Department of Computer Applications")
    print("-" * 60)
    
    result = redistribute_mentors_full(
        department="Department of Computer Applications",
        batch_id=4,
        batch_label="MCA 2024-2026"
    )
    
    print(f"Result: {result}")
    
    if result.get("success"):
        print(f"✅ SUCCESS!")
        print(f"  Students allocated: {result.get('total_students')}")
        print(f"  Mentors assigned: {result.get('total_mentors')}")
        for mentor, students in result.get("distribution", {}).items():
            print(f"  • {mentor}: {len(students)} students")
    else:
        print(f"❌ FAILED: {result.get('error')}")
        if "debug" in result:
            print(f"  Debug info:")
            for key, value in result["debug"].items():
                print(f"    {key}: {value}")
    
    # Test 2: Incremental redistribution
    print("\n📌 Test 2: Incremental Redistribution - Department of Computer Applications")
    print("-" * 60)
    
    result = redistribute_mentors_incremental(
        department="Department of Computer Applications",
        batch_id=4,
        batch_label="MCA 2024-2026"
    )
    
    print(f"Result: {result}")
    
    if result.get("success"):
        print(f"✅ SUCCESS!")
        if "newly_assigned" in result:
            print(f"  Newly assigned: {result.get('newly_assigned', 0)}")
            print(f"  Still unassigned: {result.get('still_unassigned', 0)}")
    else:
        print(f"❌ FAILED: {result.get('error')}")
    
    # Test 3: Check current state
    print("\n📌 Test 3: Current Student Mentor Assignments")
    print("-" * 60)
    
    from models import Student
    
    students = Student.query.filter(
        Student.branch.ilike("Department of Computer Applications"),
        Student.status.ilike("live")
    ).all()
    
    for s in students[:10]:
        years = s.batch.split('-')[0] + '-' + s.batch.split('-')[1] if s.batch and '-' in s.batch else s.batch
        print(f"  {s.admission_number}: batch_id={s.batch_id}, batch='{s.batch}' ({years}), mentor_id={s.mentor_id}")
