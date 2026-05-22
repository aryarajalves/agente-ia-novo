import os
import httpx

url = os.getenv("CHATWOOT_URL", "https://chatsustentabilidade.jords.site").rstrip("/")
token = os.getenv("CHATWOOT_API_TOKEN", "xGJudakMBBa7wGqZYvXvzFdW")

headers = {"api_access_token": token}
with httpx.Client() as client:
    r = client.get(f"{url}/api/v1/profile", headers=headers)
    print("Profile Status:", r.status_code)
    if r.status_code == 200:
        data = r.json()
        print("Name:", data.get("name"))
        print("Email:", data.get("email"))
        print("Role:", data.get("role"))
        print("Accounts:")
        for acc in data.get("accounts", []):
            print(f"  ID: {acc.get('id')}, Name: {acc.get('name')}, Role: {acc.get('role')}")
    else:
        print("Error response:", r.text)
