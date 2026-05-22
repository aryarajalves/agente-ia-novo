import os
import httpx

url = os.getenv("CHATWOOT_URL", "https://chatsustentabilidade.jords.site").rstrip("/")
token = os.getenv("CHATWOOT_API_TOKEN", "xGJudakMBBa7wGqZYvXvzFdW")

headers = {"api_access_token": token}
with httpx.Client() as client:
    r = client.get(f"{url}/api/v1/accounts/1/conversations?status=all", headers=headers)
    print("List Status:", r.status_code)
    if r.status_code == 200:
        data = r.json()
        payload = data.get("data", {}).get("payload", [])
        print(f"Total conversations: {len(payload)}")
        for conv in payload[:10]:
            print(f"  ID: {conv.get('id')}, Status: {conv.get('status')}, Inbox ID: {conv.get('inbox_id')}")
            meta = conv.get("meta", {})
            sender = meta.get("sender", {})
            print(f"    Sender Phone: {sender.get('phone_number')}, Name: {sender.get('name')}")
    else:
        print("Response:", r.text)
