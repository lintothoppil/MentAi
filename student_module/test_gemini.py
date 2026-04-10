import os, sys
sys.path.insert(0, '.')
from dotenv import load_dotenv
load_dotenv('.env', override=True)

# Test the new Gemini SDK directly
key = os.getenv('GEMINI_API_KEY', '')
print(f"Key: {key[:16]}... len={len(key)}")

from google import genai
from google.genai import types

client = genai.Client(api_key=key)

models_to_try = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash']
for model_name in models_to_try:
    try:
        resp = client.models.generate_content(
            model=model_name,
            contents=[types.Content(role='user', parts=[types.Part(text='Say hello in one word')])],
            config=types.GenerateContentConfig(system_instruction='You are a helpful assistant.', max_output_tokens=50)
        )
        print(f"SUCCESS with {model_name}: {resp.text.strip()}")
        break
    except Exception as e:
        print(f"  {model_name} FAILED: {type(e).__name__}: {str(e)[:100]}")
