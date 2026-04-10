import requests, json, os, sys

# Direct test — bypass Flask, check the OpenAI key
sys.path.insert(0, '.')
from dotenv import load_dotenv
load_dotenv('.env', override=True)

key = os.getenv('OPENAI_API_KEY', '')
print(f"Key: {key[:16]}... (len={len(key)})")
print(f"Valid: {bool(key) and not key.startswith('sk-placeholder') and len(key) > 20}")

try:
    from openai import OpenAI
    client = OpenAI(api_key=key)
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "Say hello in one word"}],
        max_tokens=10,
    )
    print("OpenAI WORKING:", resp.choices[0].message.content)
except Exception as e:
    print("OpenAI ERROR:", type(e).__name__, str(e)[:200])

print()

# Also test via live API
try:
    r = requests.post('http://localhost:5000/api/ai/chat', json={
        'admission_number': 'CS2020001',
        'message': 'What are my marks?',
        'history': []
    }, timeout=15)
    d = r.json()
    print("API source:", d.get('source'))
    print("API note:", d.get('note', 'none'))
    print("Reply:", d.get('reply', '')[:200])
except Exception as e:
    print("API ERROR:", e)
