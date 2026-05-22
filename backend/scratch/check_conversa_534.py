import os
import httpx

url = os.getenv("CHATWOOT_URL", "https://chatsustentabilidade.jords.site").rstrip("/")
token = os.getenv("CHATWOOT_API_TOKEN", "xGJudakMBBa7wGqZYvXvzFdW")

headers = {"api_access_token": token}
with httpx.Client() as client:
    # Let's try accounts 1, 2, 3, etc.
    for acc in [1, 2, 3]:
        r = client.get(f"{url}/api/v1/accounts/{acc}/conversations/534", headers=headers)
        print(f"Account {acc} - Conversation 534 Status:", r.status_code)
        if r.status_code == 200:
            print("Response:", r.text)
