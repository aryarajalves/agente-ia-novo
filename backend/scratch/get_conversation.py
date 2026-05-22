import os
import httpx

url = os.getenv("CHATWOOT_URL", "https://chatsustentabilidade.jords.site").rstrip("/")
token = os.getenv("CHATWOOT_API_TOKEN", "xGJudakMBBa7wGqZYvXvzFdW")

headers = {"api_access_token": token}
with httpx.Client() as client:
    r = client.get(f"{url}/api/v1/accounts/1/conversations/534", headers=headers)
    print("Conversation Status:", r.status_code)
    print("Response:", r.text)
