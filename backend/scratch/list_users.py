import os
import httpx

url = os.getenv("CHATWOOT_URL", "https://chatsustentabilidade.jords.site").rstrip("/")
token = os.getenv("CHATWOOT_API_TOKEN", "xGJudakMBBa7wGqZYvXvzFdW")

headers = {"api_access_token": token}
with httpx.Client() as client:
    r = client.get(f"{url}/api/v1/accounts/1/agents", headers=headers)
    print("Agents Status:", r.status_code)
    if r.status_code == 200:
        for agent in r.json():
            print(f"  ID: {agent.get('id')}, Email: {agent.get('email')}, Role: {agent.get('role')}")
    else:
        print("Response:", r.text)
