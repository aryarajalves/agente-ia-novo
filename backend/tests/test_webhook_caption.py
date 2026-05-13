import pytest
import json
from unittest.mock import patch, MagicMock
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from models import WebhookConfigModel, WebhookEventModel
from sqlalchemy import select
import random
import string

def random_token(prefix):
    return f"{prefix}_{''.join(random.choices(string.ascii_lowercase + string.digits, k=8))}"

@pytest.mark.asyncio
async def test_receive_webhook_image_with_caption(client: AsyncClient, db_session: AsyncSession):
    # Setup: Create a config
    token = random_token("image_caption")
    config = WebhookConfigModel(
        name="Test Config Image Caption",
        token=token,
        is_active=True,
        agent_id=None,
        leads_table="leads_test",
        process_image=True
    )
    db_session.add(config)
    await db_session.commit()

    # Temos que burlar o processamento de visão para o teste não falhar tentando baixar imagem
    payload = {
        "event": "message_created",
        "content": "Esta é a legenda da minha foto!",
        "message_type": "incoming",
        "attachments": [
            {
                "file_type": "image",
                "data_url": "https://example.com/image.jpg"
            }
        ],
        "sender": {"id": 100, "name": "Caption User", "phone_number": "+5511777777777"},
        "inbox": {"id": 4, "name": "WhatsApp", "channel_type": "Channel::Whatsapp"},
        "conversation": {"id": 40}
    }

    # Patch para evitar o processamento de visão real que faria requests externos
    with patch("webhook_router.analyze_image") as mock_vision:
        mock_vision.return_value = {"description": "Uma imagem processada"}
        
        response = await client.post(f"/webhooks/receive/{token}", json=payload)

    assert response.status_code == 200
    
    # Verificar no banco de dados se a legenda foi salva
    result = await db_session.execute(
        select(WebhookEventModel).where(WebhookEventModel.webhook_config_id == config.id)
    )
    event = result.scalar_one()
    
    assert event.message_type == "image"
    assert event.legenda == "Esta é a legenda da minha foto!"
    # O campo mensagem pode ser alterado depois pela visão, mas no recebimento deve ser a legenda ou resumo
    assert event.mensagem is not None
