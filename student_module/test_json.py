import requests
import json

r = requests.get('http://localhost:5000/api/planner/A24000')
print(json.dumps(r.json(), indent=2))
