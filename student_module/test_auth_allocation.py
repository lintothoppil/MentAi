import requests
import json

BASE = "http://localhost:5000"
session = requests.Session()

# Step 1: Login via /api/admin/login and get token
login = session.post(f"{BASE}/api/admin/login", json={
    "username": "admin",
    "password": "admin123"
})
print("Login status:", login.status_code)
data = login.json()
print("Login response:", json.dumps(data, indent=2))

# Extract token if JWT based
token = data.get("token") or data.get("access_token") or data.get("data", {}).get("token")
print("Token found:", token)

# Step 2: Try with token in header
headers = {"Authorization": f"Bearer {token}"} if token else {}
r = session.post(f"{BASE}/admin/mentors/redistribute", 
    json={
        "department": "Department of Computer Applications",
        "batch_id": 4,
        "batch_label": "MCA 2024-2026",
        "mode": "full"
    },
    headers=headers
)
print("Redistribute status:", r.status_code)
print(json.dumps(r.json(), indent=2))