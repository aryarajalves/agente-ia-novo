import pytest
import json
import asyncio
from unittest.mock import patch, MagicMock, AsyncMock
from httpx import AsyncClient
from main import app
from database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from models import WebhookConfigModel, WebhookEventModel
from sqlalchemy import select

import random
import string

def random_token(prefix):
    return f"{prefix}_{''.join(random.choices(string.ascii_lowercase + string.digits, k=8))}"

@pytest.mark.asyncio
async def test_receive_webhook_text_message(client: AsyncClient, db_session: AsyncSession):
    # Setup: Create a config
    token = random_token("text")
    config = WebhookConfigModel(
        name="Test Config",
        token=token,
        is_active=True,
        agent_id=None,
        leads_table="leads_test"
    )
    db_session.add(config)
    await db_session.commit()

    payload = {
        "event": "message_created",
        "content": "Olá mundo!",
        "message_type": "incoming",
        "sender": {"id": 1, "name": "User", "phone_number": "+5511999999999"},
        "inbox": {"id": 1, "name": "WhatsApp", "channel_type": "Channel::Whatsapp"},
        "conversation": {"id": 1}
    }

    response = await client.post(f"/webhooks/receive/{token}", json=payload)

    assert response.status_code == 200
    
    # Verify event type
    result = await db_session.execute(select(WebhookEventModel).where(WebhookEventModel.webhook_config_id == config.id))
    event = result.scalar_one()
    assert event.message_type == "text"
    assert event.mensagem == "Olá mundo!"

@pytest.mark.asyncio
@patch("webhook_router.transcribe_video")
@patch("httpx.AsyncClient.get")
async def test_receive_webhook_audio_transcription(mock_get, mock_transcribe, client: AsyncClient, db_session: AsyncSession):
    # Setup
    token = random_token("audio")
    config = WebhookConfigModel(
        name="Test Config Audio",
        token=token,
        is_active=True,
        leads_table="leads_test"
    )
    db_session.add(config)
    await db_session.commit()

    # Mock audio download
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.content = b"fake_audio_content"
    mock_get.return_value = mock_response

    # Mock transcription
    mock_transcribe.return_value = {"text": "Transcrição do áudio de teste", "duration": 10.5}
    # Se for async, o mock precisa ser um awaitable ou AsyncMock
    if hasattr(mock_transcribe, "coroutine"):
        mock_transcribe.return_value = asyncio.Future()
        mock_transcribe.return_value.set_result({"text": "Transcrição do áudio de teste", "duration": 10.5})

    payload = {
        "event": "message_created",
        "message_type": "incoming",
        "attachments": [
            {
                "file_type": "audio",
                "data_url": "https://example.com/audio.ogg"
            }
        ],
        "sender": {"id": 2, "name": "Audio User", "phone_number": "+5511888888888"},
        "inbox": {"id": 1, "name": "WhatsApp", "channel_type": "Channel::Whatsapp"},
        "conversation": {"id": 2}
    }

    response = await client.post(f"/webhooks/receive/{token}", json=payload)

    assert response.status_code == 200
    
    # Verify event and transcription
    result = await db_session.execute(select(WebhookEventModel).where(WebhookEventModel.webhook_config_id == config.id))
    event = result.scalar_one()
    assert event.message_type == "audio"
    assert "Transcrição do áudio de teste" in event.mensagem
    assert mock_transcribe.called

@pytest.mark.asyncio
async def test_receive_webhook_ignored_video(client: AsyncClient, db_session: AsyncSession):
    # Setup
    token = random_token("video")
    config = WebhookConfigModel(
        name="Test Config Video",
        token=token,
        is_active=True,
        leads_table="leads_test"
    )
    db_session.add(config)
    await db_session.commit()

    payload = {
        "event": "message_created",
        "message_type": "incoming",
        "attachments": [
            {
                "file_type": "video",
                "data_url": "https://example.com/video.mp4"
            }
        ],
        "sender": {"id": 3, "name": "Video User", "phone_number": "+1234567"},
        "inbox": {"id": 1, "name": "WhatsApp", "channel_type": "Channel::Whatsapp"},
        "conversation": {"id": 3}
    }

    response = await client.post(f"/webhooks/receive/{token}", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ignored"
    assert "video ignored" in data["reason"]

    # Verify event saved with ignored status
    result = await db_session.execute(select(WebhookEventModel).where(WebhookEventModel.webhook_config_id == config.id))
    event = result.scalar_one()
    assert event.message_type == "video"
    assert event.status == "ignored"

@pytest.mark.asyncio
async def test_receive_webhook_ignored_document(client: AsyncClient, db_session: AsyncSession):
    # Setup
    token = random_token("doc")
    config = WebhookConfigModel(
        name="Test Config Doc",
        token=token,
        is_active=True,
        leads_table="leads_test"
    )
    db_session.add(config)
    await db_session.commit()

    payload = {
        "event": "message_created",
        "message_type": "incoming",
        "attachments": [
            {
                "file_type": "file",
                "data_url": "https://example.com/doc.pdf"
            }
        ],
        "sender": {"id": 4, "name": "Doc User", "phone_number": "+1234567"},
        "inbox": {"id": 1, "name": "WhatsApp", "channel_type": "Channel::Whatsapp"},
        "conversation": {"id": 4}
    }

    response = await client.post(f"/webhooks/receive/{token}", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ignored"
    
    result = await db_session.execute(select(WebhookEventModel).where(WebhookEventModel.webhook_config_id == config.id))
    event = result.scalar_one()
    assert event.message_type == "documento"
    assert event.status == "ignored"
