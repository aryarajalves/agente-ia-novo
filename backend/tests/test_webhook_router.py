import os
import json
import pytest
from fastapi.testclient import TestClient
from httpx import Response
from respx import MockRouter

from main import app  # assuming FastAPI app is exported from main.py
from database import async_session, get_db
from models import WebhookConfigModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

# Helper to create a webhook config with empty Chatwoot fields
async def create_config(db: AsyncSession, token: str):
    config = WebhookConfigModel(
        name="Teste",
        token=token,
        leads_table="leads",
        is_active=True,
        delay_seconds=0,
        chatwoot_url=None,
        chatwoot_api_token=None,
    )
    db.add(config)
    await db.commit()
    await db.refresh(config)
    return config

@pytest.mark.asyncio
async def test_receive_webhook_uses_env_vars(monkeypatch, respx_mock: MockRouter):
    # Set environment variables that should be used as fallback
    monkeypatch.setenv("CHATWOOT_URL", "https://example.chatwoot.com")
    monkeypatch.setenv("CHATWOOT_API_TOKEN", "test-token")

    # Mock the Chatwoot label API call
    cw_url = "https://example.chatwoot.com/api/v1/accounts/1/conversations/123/labels"
    respx_mock.get(cw_url).mock(return_value=Response(200, json={"payload": []}))
    respx_mock.post(cw_url).mock(return_value=Response(200, json={"payload": []}))

    async with async_session() as session:
        token = "dummy-token"
        await create_config(session, token)

    client = TestClient(app)
    payload = {
        "event": "message_created",
        "content": "Olá",
        "conversation": {"id": 123, "account_id": 1, "inbox_id": 10, "labels": []},
        "sender": {"id": 5, "name": "Teste", "phone_number": "+123456789"},
        "inbox": {"id": 10, "name": "Inbox Test"},
        "account": {"id": 1},
        "message_type": "incoming",
    }

    response = client.post(f"/webhooks/receive/{token}", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "pending"
    # Verify that the mocked Chatwoot label endpoint was called
    assert respx_mock.calls.called

@pytest.mark.asyncio
async def test_receive_webhook_outgoing_extracts_correct_sender(monkeypatch, respx_mock: MockRouter):
    # Set environment variables that should be used as fallback
    monkeypatch.setenv("CHATWOOT_URL", "https://example.chatwoot.com")
    monkeypatch.setenv("CHATWOOT_API_TOKEN", "test-token")

    # Mock the Chatwoot label API call
    cw_url = "https://example.chatwoot.com/api/v1/accounts/1/conversations/123/labels"
    respx_mock.get(cw_url).mock(return_value=Response(200, json={"payload": []}))
    respx_mock.post(cw_url).mock(return_value=Response(200, json={"payload": []}))

    async with async_session() as session:
        token = "outgoing-token"
        await create_config(session, token)

    client = TestClient(app)
    payload = {
        "event": "message_created",
        "content": "Olá cliente, sou a IA",
        "conversation": {
            "id": 123, 
            "account_id": 1, 
            "inbox_id": 10, 
            "labels": [],
            "meta": {
                "sender": {
                    "id": 100,
                    "name": "Cliente Real",
                    "phone_number": "+5511999999999"
                }
            }
        },
        "sender": {"id": 5, "name": "IA (Agente)", "phone_number": None},
        "inbox": {"id": 10, "name": "Inbox Test"},
        "account": {"id": 1},
        "message_type": "outgoing",
    }

    response = client.post(f"/webhooks/receive/{token}", json=payload)
    assert response.status_code == 200
    
    # We can verify the db if we want, but returning 200 without error is a start.
    # To really verify, we would fetch the WebhookEventModel from DB to see if the contact is "Cliente Real"
    async with async_session() as session:
        from models import WebhookEventModel
        res = await session.execute(select(WebhookEventModel).where(WebhookEventModel.telefone == "+5511999999999"))
        event = res.scalars().first()
        assert event is not None
        assert event.contato_nome == "Cliente Real"
