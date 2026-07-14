import os
import httpx

url = os.getenv("ZAPJORDS_URL", "https://chatsustentabilidade.jords.site").rstrip("/")
token = os.getenv("ZAPJORDS_API_TOKEN", "xGJudakMBBa7wGqZYvXvzFdW")

headers = {"api_access_token": token}
with httpx.Client() as client:
    r = client.get(f"{url}/api/v1/accounts/1/webhooks", headers=headers)
    print("Webhooks Status:", r.status_code)
    if r.status_code == 200:
        print("Webhooks JSON:", r.json())
    else:
        print("Response:", r.text)
