"""
Test the view endpoint to see if it shows allocated students correctly
"""

import sys
sys.path.insert(0, 'd:\\mentAi\\student_module')

from app import app
import json

with app.app_context():
    print("=" * 60)
    print("TESTING /api/admin/mentorship/view ENDPOINT")
    print("=" * 60)
    
    with app.test_client() as client:
        # Test viewing MCA 2024-2026 batch
        print("\n📌 Test: View MCA 2024-2026 Allocation")
        print("-" * 60)
        
        response = client.get('/api/admin/mentorship/view?department=Department of Computer Applications&batch=MCA 2024-2026')
        
        print(f"Status: {response.status_code}")
        data = response.get_json()
        
        if data.get('success'):
            print(f"\n✅ SUCCESS!")
            print(f"  Mentors found: {len(data['data'])}")
            print(f"  Unassigned students: {data['unassigned_count']}")
            
            for mentor in data['data']:
                print(f"\n  👨‍🏫 {mentor['name']} ({mentor['designation']})")
                print(f"     Total Load (all batches): {mentor['total_load']}")
                print(f"     Mentees in MCA 2024-2026: {mentor['batch_mentee_count']}")
                
                if mentor['mentees']:
                    for mentee in mentor['mentees']:
                        print(f"       - {mentee['admission_number']}: {mentee['name']}")
        else:
            print(f"\n❌ FAILED: {data.get('message')}")
        
        # Pretty print full response
        print("\n" + "=" * 60)
        print("FULL API RESPONSE:")
        print("=" * 60)
        print(json.dumps(data, indent=2))
