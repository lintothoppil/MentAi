"""
Test the fixed /api/admin/mentorship/allocate endpoint
"""

import sys
sys.path.insert(0, 'd:\\mentAi\\student_module')

from app import app
from models import db, Student

with app.app_context():
    print("=" * 60)
    print("TESTING FIXED /api/admin/mentorship/allocate ENDPOINT")
    print("=" * 60)
    
    # Simulate the request from React UI
    with app.test_client() as client:
        print("\n📌 Test: Department of Computer Applications - MCA 2024-2026")
        print("-" * 60)
        
        response = client.post('/api/admin/mentorship/allocate', json={
            "department": "Department of Computer Applications",
            "batch": "MCA 2024-2026"
        })
        
        print(f"Status: {response.status_code}")
        data = response.get_json()
        print(f"Response: {data}")
        
        if data.get('success'):
            print(f"\n✅ SUCCESS!")
            print(f"  Message: {data.get('message')}")
            if data.get('distribution'):
                print(f"  Distribution:")
                for mentor, students in data['distribution'].items():
                    print(f"    • {mentor}: {len(students)} students")
        else:
            print(f"\n❌ FAILED: {data.get('message', 'Unknown error')}")
    
    # Check current student assignments
    print("\n" + "=" * 60)
    print("CURRENT STUDENT ASSIGNMENTS")
    print("=" * 60)
    
    students = Student.query.filter(
        Student.branch.ilike("Department of Computer Applications"),
        Student.batch_id == 4
    ).all()
    
    for s in students:
        mentor_name = "Unassigned"
        if s.mentor_id:
            from models import Faculty
            m = Faculty.query.get(s.mentor_id)
            mentor_name = m.name if m else f"ID:{s.mentor_id}"
        print(f"  {s.admission_number}: {mentor_name}")
