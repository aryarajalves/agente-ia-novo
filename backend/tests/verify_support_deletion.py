import asyncio
import httpx
import sys

async def test_deletion():
    # This assumes the server is running on localhost:8000
    # and we have an API Key (we can get it from the environment or just try to find it)
    base_url = "http://localhost:8000"
    api_key = "123456" # Use a valid one if possible
    
    headers = {"X-API-Key": api_key}
    
    # 1. List support requests
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(f"{base_url}/support-requests", headers=headers)
            print(f"Status: {res.status_code}")
            if res.status_code == 200:
                data = res.json()
                print(f"Found {len(data)} requests")
                if data:
                    target_id = data[0]['id']
                    print(f"Testing deletion of ID: {target_id}")
                    
                    # 2. Test single delete
                    del_res = await client.delete(f"{base_url}/support-requests/{target_id}", headers=headers)
                    print(f"Delete Status: {del_res.status_code} - {del_res.text}")
                    
                    # 3. Test bulk delete (if there are more)
                    if len(data) > 1:
                        ids = [d['id'] for d in data[1:3]]
                        print(f"Testing bulk deletion of IDs: {ids}")
                        bulk_res = await client.post(f"{base_url}/support-requests/bulk-delete", headers=headers, json={"ids": ids})
                        print(f"Bulk Delete Status: {bulk_res.status_code} - {bulk_res.text}")
            else:
                print(f"Error: {res.text}")
        except Exception as e:
            print(f"Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_deletion())
