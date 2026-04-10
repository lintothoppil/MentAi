import os, sys
sys.path.insert(0, '.')
from dotenv import load_dotenv
load_dotenv('.env', override=True)

key = os.getenv('OPENAI_API_KEY', '')
print(f"Key len={len(key)}, valid={bool(key)}")

try:
    from openai import OpenAI
    client = OpenAI(api_key=key)
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "Say hello in one word"}],
        max_tokens=10,
    )
    print("SUCCESS:", resp.choices[0].message.content)
except Exception as e:
    print(f"OPENAI_ERROR [{type(e).__name__}]:", str(e))
