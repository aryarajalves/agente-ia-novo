import httpx

url = "http://localhost:8000/webhooks/receive/whatsapp"
payload = {
    "event": "message_created",
    "id": 9999,
    "content": "#resetar",
    "message_type": "incoming",
    "content_type": "text",
    "content_attributes": {},
    "created_at": "2026-05-19T17:15:00.000Z",
    "conversation": {
        "id": 6,
        "contact_inbox": {
            "source_id": "558596123586"
        },
        "inbox_id": 4,
        "account_id": 1
    },
    "sender": {
        "id": 1079,
        "name": "Aryaraj",
        "phone_number": "+558596123586",
        "type": "contact"
    }
}

r = httpx.post(url, json=payload)
print("Status:", r.status_code)
print("Response:", r.text)
