import os
import httpx

url = os.getenv("CHATWOOT_URL", "https://chatsustentabilidade.jords.site").rstrip("/")
token = os.getenv("CHATWOOT_API_TOKEN", "xGJudakMBBa7wGqZYvXvzFdW")

headers = {"api_access_token": token}
with httpx.Client() as client:
    r = client.get(f"{url}/api/v1/accounts/1/inboxes", headers=headers)
    print("Inboxes Status:", r.status_code)
    if r.status_code == 200:
        data = r.json()
        payload = data.get("payload", [])
        print(f"Total inboxes: {len(payload)}")
        for inbox in payload:
            print(f"  ID: {inbox.get('id')}, Name: {inbox.get('name')}, Channel Type: {inbox.get('channel_type')}")
    else:
        print("Response:", r.text)
