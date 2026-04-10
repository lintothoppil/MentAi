"""
Debug script to check student data and batch assignments
"""

import sys
sys.path.insert(0, 'd:\\mentAi\\student_module')

from models import db, Student, Faculty, Batch
from services.batch_service import extract_year_range
from app import app

with app.app_context():
    print("=" * 60)
    print("STUDENT DATABASE DEBUG")
    print("=" * 60)
    
    # Get all live students
    all_students = Student.query.filter(Student.status.ilike('live')).all()
    print(f"\nTotal live students: {len(all_students)}")
    
    # Group by department
    departments = {}
    for s in all_students:
        dept = s.branch
        if dept not in departments:
            departments[dept] = []
        departments[dept].append(s)
    
    print("\n" + "=" * 60)
    print("STUDENTS BY DEPARTMENT")
    print("=" * 60)
    
    for dept, students in sorted(departments.items()):
        print(f"\n📚 {dept}: {len(students)} students")
        print("-" * 60)
        
        # Group by batch
        batches = {}
        for s in students:
            batch_key = f"batch_id={s.batch_id}, batch='{s.batch}'"
            if batch_key not in batches:
                batches[batch_key] = []
            batches[batch_key].append(s)
        
        for batch_key, batch_students in sorted(batches.items()):
            print(f"\n  {batch_key}: {len(batch_students)} students")
            for s in batch_students[:5]:  # Show first 5
                years = extract_year_range(s.batch) if s.batch else None
                print(f"    - {s.admission_number} (years={years}, mentor_id={s.mentor_id})")
            
            if len(batch_students) > 5:
                print(f"    ... and {len(batch_students) - 5} more")
    
    print("\n" + "=" * 60)
    print("FACULTY BY DEPARTMENT")
    print("=" * 60)
    
    all_faculty = Faculty.query.filter(Faculty.status.ilike('live')).all()
    faculty_by_dept = {}
    for f in all_faculty:
        dept = f.department
        if dept not in faculty_by_dept:
            faculty_by_dept[dept] = []
        faculty_by_dept[dept].append(f)
    
    for dept, faculty in sorted(faculty_by_dept.items()):
        print(f"\n📚 {dept}: {len(faculty)} faculty")
        for f in faculty:
            eligible = f.designation.lower() not in ['hod', 'admin'] and \
                      f.department.strip().lower() not in ['basic science and humanities']
            status = "✓" if eligible else "✗"
            print(f"  {status} {f.name} - {f.designation}")
    
    print("\n" + "=" * 60)
    print("BATCH INFORMATION")
    print("=" * 60)
    
    all_batches = Batch.query.all()
    print(f"\nTotal batches: {len(all_batches)}")
    
    for batch in all_batches[:20]:  # Show first 20
        print(f"  ID={batch.id}, Course={batch.course_id}, Years={batch.start_year}-{batch.end_year}, Status={batch.status}")
    
    if len(all_batches) > 20:
        print(f"  ... and {len(all_batches) - 20} more")
