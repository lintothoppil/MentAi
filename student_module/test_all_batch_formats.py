"""
Test all batch format variations for Computer Applications
"""

import sys
sys.path.insert(0, 'd:\\mentAi\\student_module')

from app import app
from models import db, Student

with app.app_context():
    print("=" * 60)
    print("TESTING ALL BATCH FORMATS - COMPUTER APPLICATIONS")
    print("=" * 60)
    
    # Test different batch label formats
    test_cases = [
        ("MCA 2024-2026", "With MCA prefix"),
        ("2024-2026", "Without prefix"),
        ("MCA 2023-2025", "Older batch with prefix"),
        ("2023-2025", "Older batch without prefix"),
    ]
    
    with app.test_client() as client:
        for batch_label, description in test_cases:
            print(f"\n📌 Test: {description} - '{batch_label}'")
            print("-" * 60)
            
            response = client.post('/api/admin/mentorship/allocate', json={
                "department": "Department of Computer Applications",
                "batch": batch_label
            })
            
            print(f"Status: {response.status_code}")
            data = response.get_json()
            
            if data.get('success'):
                print(f"✅ SUCCESS: {data['message']}")
            else:
                print(f"❌ FAILED: {data.get('message')}")
    
    # Show what batches actually exist
    print("\n" + "=" * 60)
    print("ACTUAL BATCHES IN DATABASE")
    print("=" * 60)
    
    students = Student.query.filter(
        Student.branch.ilike("Department of Computer Applications")
    ).all()
    
    from collections import Counter
    batch_counts = Counter([s.batch for s in students])
    
    for batch, count in sorted(batch_counts.items()):
        print(f"  {batch}: {count} students")
