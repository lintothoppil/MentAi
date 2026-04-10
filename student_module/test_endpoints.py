import requests
import json
import io

BASE_URL = "http://127.0.0.1:5000"
session = requests.Session()

def test_endpoints():
    print("--- 0. Login as admin to get session cookie ---")
    # For testing, we mock the session or actually login.
    # The login_required uses session['user_id'].
    login_resp = session.post(f"{BASE_URL}/api/login", json={
        "username": "admin",
        "password": "password" # Adjust if necessary, but app.py says admin123
    })
    
    login_resp = session.post(f"{BASE_URL}/api/login", json={
        "username": "admin",
        "password": "admin123"
    })
    print("Login:", login_resp.status_code, login_resp.text)
    
    print("\n--- 1. Add a faculty/mentor ---")
    fac_resp = session.post(f"{BASE_URL}/admin/faculty/add", json={
        "username": "mentor01", 
        "password": "pass123", 
        "name": "Dr. Smith", 
        "designation": "Mentor", 
        "department": "Computer Science"
    })
    print("Add Faculty:", fac_resp.status_code, fac_resp.text)
    
    print("\n--- 2. Upload students CSV ---")
    csv_data = "admission_number,name,roll_number,department,batch,email\nS101,John Doe,1,Computer Science,2025-2029,john@test.com\nS102,Jane Doe,2,Computer Science,2025-2029,jane@test.com\n"
    files = {'file': ('students.csv', io.StringIO(csv_data), 'text/csv')}
    upload_resp = session.post(f"{BASE_URL}/admin/students/bulk-upload", files=files)
    print("Bulk Upload:", upload_resp.status_code, upload_resp.text)
    
    print("\n--- 3. Check mentor distribution ---")
    dist_resp = session.post(f"{BASE_URL}/admin/mentors/redistribute", json={
        "department": "Computer Science", 
        "batch_id": 1
    })
    print("Redistribute Mentors:", dist_resp.status_code, dist_resp.text)
    
    print("\n--- 4. Verify alumni promotion ---")
    batch_resp = session.post(f"{BASE_URL}/admin/batches/add", json={
        "course_id": 1, 
        "start_year": 2029, 
        "end_year": 2033,
        "department": "Computer Science"
    })
    print("Add new batch:", batch_resp.status_code, batch_resp.text)
    
    alumni_resp = session.get(f"{BASE_URL}/admin/alumni")
    print("Get Alumni:", alumni_resp.status_code, alumni_resp.text)

if __name__ == "__main__":
    test_endpoints()
