import requests
import json
import codecs

r = requests.get('http://localhost:5000/api/planner/A24000')
with codecs.open('api_out.json', 'w', 'utf-8') as f:
    json.dump(r.json(), f, indent=2)
