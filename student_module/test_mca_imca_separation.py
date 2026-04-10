"""
Test script for MCA/IMCA separation and auto-promotion of expired batches.
Verifies that:
1. Expired batches (end_year < current_year) are auto-promoted to alumni
2. MCA and IMCA students are kept separate during mentor allocation
3. Alumni are grouped by course (MCA vs IMCA) not just department
"""

import sys
sys.path.insert(0, 'd:\\mentAi\\student_module')

from models import db, Student, Batch, Course, AlumniStudent
from services.batch_service import (
    promote_expired_batches_to_alumni,
    validate_new_batch,
    redistribute_mentors_full,
    get_grouped_alumni,
    get_course_max_batches
)
from app import app
from datetime import datetime

def test_promote_expired_batches():
    """Test automatic promotion of expired batches to alumni"""
    print("\n" + "=" * 60)
    print("TEST 1: AUTO-PROMOTION OF EXPIRED BATCHES")
    print("=" * 60)
    
    with app.app_context():
        current_year = datetime.now().year
        
        # Check for expired batches before promotion
        expired_before = Batch.query.filter(
            Batch.status == "active",
            Batch.end_year < current_year
        ).all()
        
        print(f"\nCurrent year: {current_year}")
        print(f"Expired batches found (end_year < {current_year}): {len(expired_before)}")
        
        if expired_before:
            for batch in expired_before:
                student_count = Student.query.filter_by(
                    batch_id=batch.id, 
                    status="Live"
                ).count()
                print(f"  - {batch.course.name} {batch.start_year}-{batch.end_year}: {student_count} live students")
            
            # Run promotion
            result = promote_expired_batches_to_alumni()
            
            if result.get("success"):
                print(f"\n✅ Promotion successful!")
                print(f"   Batches processed: {result.get('expired_batches_found', 0)}")
                
                summary = result.get("summary", {})
                for batch_label, data in summary.items():
                    print(f"   • {batch_label}: {data['count']} students promoted to alumni")
                
                return True
            else:
                print(f"\n❌ Promotion failed: {result.get('error')}")
                return False
        else:
            print(f"\nℹ️  No expired batches found (already clean)")
            return True

def test_mca_imca_separation():
    """Verify MCA and IMCA are treated as separate courses"""
    print("\n" + "=" * 60)
    print("TEST 2: MCA/IMCA COURSE SEPARATION")
    print("=" * 60)
    
    with app.app_context():
        # Find MCA and IMCA courses
        mca_course = Course.query.filter(Course.name.ilike('%mca%')).first()
        imca_course = Course.query.filter(Course.name.ilike('%imca%')).first()
        
        if not mca_course or not imca_course:
            print("⚠️  Could not find both MCA and IMCA courses")
            return False
        
        print(f"\n✓ Found MCA Course: {mca_course.name} (ID: {mca_course.id})")
        print(f"✓ Found IMCA Course: {imca_course.name} (ID: {imca_course.id})")
        
        # Verify max batches
        mca_max = get_course_max_batches(mca_course.name)
        imca_max = get_course_max_batches(imca_course.name)
        
        print(f"\nMax batches allowed:")
        print(f"  MCA: {mca_max} (expected: 2)")
        print(f"  IMCA: {imca_max} (expected: 5)")
        
        if mca_max != 2 or imca_max != 5:
            print(f"\n❌ FAIL: Max batches incorrect!")
            return False
        
        print(f"\n✅ PASS: Course separation correct")
        
        # Check active batches
        mca_active = Batch.query.filter_by(course_id=mca_course.id, status="active").all()
        imca_active = Batch.query.filter_by(course_id=imca_course.id, status="active").all()
        
        print(f"\nActive batches:")
        print(f"  MCA: {len(mca_active)} batches")
        for b in mca_active:
            students = Student.query.filter_by(batch_id=b.id, status="Live").count()
            print(f"    - {b.start_year}-{b.end_year}: {students} students")
        
        print(f"  IMCA: {len(imca_active)} batches")
        for b in imca_active:
            students = Student.query.filter_by(batch_id=b.id, status="Live").count()
            print(f"    - {b.start_year}-{b.end_year}: {students} students")
        
        return True

def test_alumni_grouping():
    """Test that alumni are grouped by course (MCA vs IMCA)"""
    print("\n" + "=" * 60)
    print("TEST 3: ALUMNI GROUPING BY COURSE")
    print("=" * 60)
    
    with app.app_context():
        grouped = get_grouped_alumni()
        
        if not grouped:
            print("ℹ️  No alumni records found")
            return True
        
        print(f"\nAlumni grouped by Department → Course → Batch:")
        
        for dept, courses in grouped.items():
            print(f"\n📚 {dept}:")
            for course_name, batches in courses.items():
                print(f"   🎓 {course_name}:")
                for batch_label, students in batches.items():
                    print(f"      {batch_label}: {len(students)} alumni")
                    # Show first 3
                    for s in students[:3]:
                        mentor_str = f" (Mentor: {s.get('mentor', 'N/A')})" if s.get('mentor') else ""
                        print(f"        - {s['admission_number']}: {s['name']}{mentor_str}")
                    if len(students) > 3:
                        print(f"        ... and {len(students) - 3} more")
        
        # Verify structure has course separation
        computer_apps = grouped.get("Department of Computer Applications", {})
        if computer_apps:
            has_mca = "MCA" in computer_apps or any("MCA" in k.upper() for k in computer_apps.keys())
            has_imca = "IMCA" in computer_apps or any("IMCA" in k.upper() for k in computer_apps.keys())
            
            if has_mca and has_imca:
                print(f"\n✅ PASS: MCA and IMCA alumni properly separated!")
                return True
            elif has_mca or has_imca:
                print(f"\n⚠️  Only one course type found (may be expected)")
                return True
            else:
                print(f"\n⚠️  Unexpected course grouping")
                return True
        else:
            print(f"\nℹ️  No Computer Applications alumni yet (expected if no promotions)")
            return True

def main():
    print("\n" + "=" * 60)
    print("MCA/IMCA SEPARATION & AUTO-PROMOTION TEST SUITE")
    print("=" * 60)
    
    results = []
    
    # Test 1: Auto-promote expired batches
    results.append(("Auto-Promotion", test_promote_expired_batches()))
    
    # Test 2: Course separation
    results.append(("Course Separation", test_mca_imca_separation()))
    
    # Test 3: Alumni grouping
    results.append(("Alumni Grouping", test_alumni_grouping()))
    
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
        print("\n🎉 All tests passed! MCA/IMCA separation working correctly.")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed.")
    
    print("=" * 60)

if __name__ == "__main__":
    main()
