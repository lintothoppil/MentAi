"""
Test the /admin/batches/add API endpoint with validation logic.
"""

import sys
sys.path.insert(0, 'd:\\mentAi\\student_module')

from app import app
from models import db, Course, Batch

def test_api_endpoint():
    """Test the batches/add endpoint"""
    print("\n" + "=" * 60)
    print("TESTING POST /admin/batches/add ENDPOINT")
    print("=" * 60)
    
    with app.test_client() as client:
        # First, let's check what courses exist
        print("\n📚 Available Courses:")
        with app.app_context():
            courses = Course.query.all()
            for c in courses[:5]:  # Show first 5
                active_batches = Batch.query.filter_by(
                    course_id=c.id, status="active"
                ).count()
                print(f"  {c.id}. {c.name} - {active_batches} active batches")
        
        # Test Case 1: Missing required fields
        print("\n\n📌 Test 1: Missing required fields")
        response = client.post('/admin/batches/add', 
                              json={"course_id": 8})
        data = response.get_json()
        print(f"Status: {response.status_code}")
        print(f"Response: {data}")
        
        # Test Case 2: Invalid year (future)
        print("\n\n📌 Test 2: Invalid year (2030)")
        response = client.post('/admin/batches/add',
                              json={
                                  "course_id": 8,
                                  "start_year": 2030,
                                  "end_year": 2032,
                                  "department": "Department of Computer Applications"
                              })
        data = response.get_json()
        print(f"Status: {response.status_code}")
        if "error" in data:
            print(f"✓ Error returned: {data['error']}")
            if "reason" in data:
                print(f"  Reason: {data['reason'][:100]}...")
        
        # Test Case 3: Invalid year (past)
        print("\n\n📌 Test 3: Invalid year (2020)")
        response = client.post('/admin/batches/add',
                              json={
                                  "course_id": 8,
                                  "start_year": 2020,
                                  "end_year": 2022,
                                  "department": "Department of Computer Applications"
                              })
        data = response.get_json()
        print(f"Status: {response.status_code}")
        if "error" in data:
            print(f"✓ Error returned: {data['error']}")
            if "reason" in data:
                print(f"  Reason: {data['reason'][:100]}...")
        
        # Test Case 4: Valid year but may fail gap check
        print("\n\n📌 Test 4: Current year (2026) - depends on existing data")
        response = client.post('/admin/batches/add',
                              json={
                                  "course_id": 8,
                                  "start_year": 2026,
                                  "end_year": 2028,
                                  "department": "Department of Computer Applications"
                              })
        data = response.get_json()
        print(f"Status: {response.status_code}")
        print(f"Response: {data}")
        
        if "success" in data:
            print(f"\n✅ SUCCESS!")
            print(f"   New batch: {data.get('new_batch')}")
            print(f"   Promoted to alumni: {len(data.get('promoted_to_alumni', []))} students")
            if data.get('oldest_batch_completed'):
                print(f"   Oldest batch completed: ID {data['oldest_batch_completed']}")
        elif "error" in data:
            print(f"\n⚠️  ERROR:")
            if "reason" in data:
                print(f"   Reason: {data['reason']}")
            else:
                print(f"   Error: {data['error']}")
        
        # Test Case 5: Try adding same batch again (duplicate)
        print("\n\n📌 Test 5: Duplicate batch (if Test 4 succeeded)")
        response = client.post('/admin/batches/add',
                              json={
                                  "course_id": 8,
                                  "start_year": 2026,
                                  "end_year": 2028,
                                  "department": "Department of Computer Applications"
                              })
        data = response.get_json()
        print(f"Status: {response.status_code}")
        if "error" in data and "already exists" in str(data.get('reason', '')):
            print(f"✓ Correctly blocked duplicate batch")
            print(f"  Reason: {data.get('reason', '')}")
        elif "success" in data:
            print(f"⚠️  Unexpectedly allowed duplicate")
        else:
            print(f"Response: {data}")

if __name__ == "__main__":
    print("=" * 60)
    print("API ENDPOINT VALIDATION TEST")
    print("=" * 60)
    
    test_api_endpoint()
    
    print("\n" + "=" * 60)
    print("TEST COMPLETE")
    print("=" * 60)
