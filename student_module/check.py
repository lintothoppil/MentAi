import urllib.request, json
try:
    urllib.request.urlopen("http://localhost:5000/api/admin/students")
except Exception as e:
    data = json.loads(e.read().decode('utf-8'))
    with open('error_out.txt', 'w', encoding='utf-8') as f:
        f.write(data["message"])
