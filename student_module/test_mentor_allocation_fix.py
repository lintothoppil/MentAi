"""
Test script to verify mentor allocation fix.
Tests the /admin/mentors/redistribute endpoint with the fixed logic.
"""

import requests
import json

BASE_URL = "http://127.0.0.1:5000"

def login_as_admin_session(session):
    """Login as admin using a requests Session"""
    # Try default admin credentials
    response = session.post(f"{BASE_URL}/api/admin/login", json={
        "username": "admin",
        "password": "admin123"
    })
    
    print(f"Login response status: {response.status_code}")
    if response.status_code == 200 and response.json().get('success'):
        print("✓ Logged in as admin")
        return True
    else:
        print(f"✗ Admin login failed: {response.text}")
        return False

def login_as_admin():
    """Legacy function - kept for compatibility"""
    return login_as_admin_session(requests.Session())

def test_redistribute_full_session(session):
    """Test full redistribution for Department of Computer Applications"""
    print("\n=== Testing Full Mentor Redistribution ===")
    
    payload = {
        "department": "Department of Computer Applications",
        "batch_id": 4,
        "batch_label": "MCA 2024-2026",
        "mode": "full"
    }
    
    print(f"Request payload: {json.dumps(payload, indent=2)}")
    
    response = session.post(
        f"{BASE_URL}/admin/mentors/redistribute",
        json=payload
    )
    
    print(f"\nResponse status: {response.status_code}")
    print(f"Response body: {json.dumps(response.json(), indent=2)}")
    
    result = response.json()
    
    if result.get("success"):
        print("\n✓ SUCCESS!")
        print(f"  Total students: {result.get('total_students', 'N/A')}")
        print(f"  Total mentors: {result.get('total_mentors', 'N/A')}")
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
            print(f"  Debug info: {json.dumps(result['debug'], indent=2)}")
        return False

def test_redistribute_full(cookies):
    """Legacy function - kept for compatibility"""
    return test_redistribute_full_session(requests.Session())

def test_redistribute_incremental_session(session):
    """Test incremental redistribution"""
    print("\n=== Testing Incremental Mentor Redistribution ===")
    
    payload = {
        "department": "Department of Computer Applications",
        "batch_id": 5,
        "batch_label": "MCA 2025-2027",
        "mode": "incremental"
    }
    
    print(f"Request payload: {json.dumps(payload, indent=2)}")
    
    response = session.post(
        f"{BASE_URL}/admin/mentors/redistribute",
        json=payload
    )
    
    print(f"\nResponse status: {response.status_code}")
    print(f"Response body: {json.dumps(response.json(), indent=2)}")
    
    result = response.json()
    
    if result.get("success"):
        print("\n✓ SUCCESS!")
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

def test_redistribute_incremental(cookies):
    """Legacy function - kept for compatibility"""
    return test_redistribute_incremental_session(requests.Session())

def test_business_administration_session(session):
    """Test redistribution for Department of Business Administration"""
    print("\n=== Testing Business Administration Department ===")
    
    payload = {
        "department": "Department of Business Administration",
        "batch_id": 8,
        "batch_label": "MBA 2024-2026",
        "mode": "full"
    }
    
    print(f"Request payload: {json.dumps(payload, indent=2)}")
    
    response = session.post(
        f"{BASE_URL}/admin/mentors/redistribute",
        json=payload
    )
    
    print(f"\nResponse status: {response.status_code}")
    print(f"Response body: {json.dumps(response.json(), indent=2)}")
    
    result = response.json()
    
    if result.get("success"):
        print("\n✓ SUCCESS!")
        print(f"  Total students: {result.get('total_students', 'N/A')}")
        print(f"  Total mentors: {result.get('total_mentors', 'N/A')}")
        return True
    else:
        print(f"\n✗ FAILED: {result.get('error', 'Unknown error')}")
        return False

def test_business_administration(cookies):
    """Legacy function - kept for compatibility"""
    return test_business_administration_session(requests.Session())

if __name__ == "__main__":
    print("=" * 60)
    print("MENTOR ALLOCATION FIX VERIFICATION TEST")
    print("=" * 60)
    
    # Use a session to maintain cookies
    session = requests.Session()
    
    # Login
    if not login_as_admin_session(session):
        print("\n✗ Cannot proceed without admin login")
        print("Please ensure:")
        print("  1. Flask app is running on http://127.0.0.1:5000")
        print("  2. Admin user exists with username='admin' and password='admin123'")
        exit(1)
    
    # Run tests
    results = []
    
    print("\n" + "=" * 60)
    print("Running Test Suite")
    print("=" * 60)
    
    # Test 1: Full redistribution for Computer Applications
    results.append(("Full Redistribution (Computer Applications)", 
                   test_redistribute_full_session(session)))
    
    # Test 2: Incremental redistribution
    results.append(("Incremental Redistribution (Computer Applications)", 
                   test_redistribute_incremental_session(session)))
    
    # Test 3: Business Administration department
    results.append(("Full Redistribution (Business Administration)", 
                   test_business_administration_session(session)))
    
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
