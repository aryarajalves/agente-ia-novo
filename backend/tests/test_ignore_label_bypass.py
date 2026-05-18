import pytest
import os
import json
from datetime import datetime
from sqlalchemy import text
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from webhooks.service import ensure_leads_table
from models import WebhookConfigModel, WebhookEventModel, AgentConfigModel
from sqlalchemy import select

@pytest.fixture
async def admin_headers(client: AsyncClient):
    """Obtém os headers de autenticação do admin."""
    admin_email = os.getenv("ADMIN_EMAIL", "aryarajmarketing@gmail.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "123456")
    login_res = await client.post("/login", json={"email": admin_email, "password": admin_password})
    token = login_res.json()["token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.mark.asyncio
async def test_ignore_label_regular_message_and_reset_bypass(client: AsyncClient, admin_headers, db_session: AsyncSession):
    """
    Testa se mensagens normais são salvas no banco de forma pausada/ignorada quando o lead tem
    a tag de bloqueio, e se palavras-chave de reset/deleção dão bypass no filtro de bloqueio.
    """
    
    # 1. Garantir tabela de leads e criar webhook de teste
    await ensure_leads_table("leads")
    
    token = "test_bypass_webhook_token_99"
    leads_table = "leads"
    
    config = WebhookConfigModel(
        name="Webhook Teste Bypass",
        token=token,
        chatwoot_url="https://chat.test-bypass.com",
        chatwoot_api_token="test_api_token_cw",
        leads_table=leads_table,
        ignore_by_label="suporte humano",
        delete_keywords=json.dumps(["#resetar"])
    )
    db_session.add(config)
    await db_session.commit()
    await db_session.refresh(config)

    # Limpar registros com telefone de teste
    tel_teste = "559987654321"
    await db_session.execute(text(f"DELETE FROM {leads_table} WHERE telefone = :tel"), {"tel": tel_teste})
    await db_session.execute(text("DELETE FROM webhook_events WHERE telefone = :tel"), {"tel": tel_teste})
    await db_session.commit()

    # --- CENÁRIO A: Mensagem REGULAR do usuário contendo a etiqueta de ignorar "suporte humano" ---
    # Ela DEVE ser gravada no banco com status 'ignored' e ter agente_response explicando a pausa
    payload_regular = {
        "event": "message_created",
        "id": 999901,
        "content": "Quero saber o valor do curso de automacao",
        "message_type": "incoming",
        "conversation": {
            "id": 8801,
            "account_id": 1,
            "inbox_id": 10,
            "labels": ["suporte humano"] # Possui a etiqueta de bloqueio
        },
        "sender": {
            "id": 7701,
            "phone_number": f"+{tel_teste}",
            "name": "Cliente Teste Regular"
        }
    }

    response_regular = await client.post(
        f"/webhooks/receive/{token}", 
        json=payload_regular
    )
    
    assert response_regular.status_code == 200
    res_data = response_regular.json()
    assert res_data["status"] == "ignored"
    assert "block label" in res_data["reason"]

    # Validar se o evento foi gravado na tabela webhook_events
    evt_stmt = select(WebhookEventModel).where(
        WebhookEventModel.webhook_config_id == config.id,
        WebhookEventModel.telefone == tel_teste,
        WebhookEventModel.mensagem_id == "999901"
    )
    evt_res = await db_session.execute(evt_stmt)
    event_row = evt_res.scalar_one_or_none()
    
    assert event_row is not None, "A mensagem regular do cliente com tag de bloqueio deveria ter sido gravada no histórico de eventos"
    assert event_row.status == "ignored", "O evento deveria ter sido gravado com status 'ignored'"
    assert "Automação pausada" in event_row.agent_response
    assert "suporte humano" in event_row.agent_response
    
    # Validar que os steps informativos de pausa da automação foram criados
    steps = json.loads(event_row.processing_steps or "[]")
    assert len(steps) > 0
    assert "🚫 Automação Pausada" in steps[0]["step"]

    # --- CENÁRIO B: Palavra-chave de DELEÇÃO/RESET (#resetar) ---
    # Ela DEVE dar bypass (ignorar) no filtro de ignore_by_label e continue o fluxo do webhook normalmente!
    payload_reset = {
        "event": "message_created",
        "id": 999902,
        "content": "#resetar",
        "message_type": "incoming",
        "conversation": {
            "id": 8801,
            "account_id": 1,
            "inbox_id": 10,
            "labels": ["suporte humano"] # Ainda possui a etiqueta de bloqueio
        },
        "sender": {
            "id": 7701,
            "phone_number": f"+{tel_teste}",
            "name": "Cliente Teste Regular"
        }
    }

    response_reset = await client.post(
        f"/webhooks/receive/{token}", 
        json=payload_reset
    )
    
    assert response_reset.status_code == 200
    res_data_reset = response_reset.json()
    
    # A resposta do webhook deve passar sem ser 'ignored' (vai para o debounce de agrupamento ou processamento direto)
    assert res_data_reset.get("status") != "ignored", "A palavra-chave de reset/deleção não deveria ser bloqueada pelo ignore_by_label"

    # --- CENÁRIO C: Evitar reinserção de lead resetado por webhook de eco (is_out) ---
    # 1. Simular o estado após a task do Celery deletar o lead fisicamente do banco
    await db_session.execute(text(f"DELETE FROM {leads_table} WHERE telefone = :tel"), {"tel": tel_teste})
    await db_session.commit()

    # 2. Simular que o telefone acabou de ser resetado inserindo a chave no Redis
    import redis as redis_lib
    _redis_local = redis_lib.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"), decode_responses=True)
    _redis_local.setex(f"webhook:resetting:{config.id}:{tel_teste}", 10, "1")
    
    # 3. Enviar um webhook de eco de saída do agente (is_out = True)
    payload_eco = {
        "event": "message_created",
        "id": 999903,
        "content": "Zerei a memoria do agente para esse contato.",
        "message_type": "outgoing",
        "conversation": {
            "id": 8801,
            "account_id": 1,
            "inbox_id": 10,
            "labels": []
        },
        "sender": {
            "id": 1,
            "phone_number": f"+{tel_teste}",
            "name": "Bot"
        }
    }
    
    response_eco = await client.post(
        f"/webhooks/receive/{token}", 
        json=payload_eco
    )
    
    assert response_eco.status_code == 200
    assert response_eco.json()["status"] == "outgoing_ignored"
    
    # 4. Validar que o lead NÃO foi reinserido na tabela de leads!
    lead_check = await db_session.execute(
        text(f"SELECT id FROM {leads_table} WHERE telefone = :tel"),
        {"tel": tel_teste}
    )
    assert lead_check.fetchone() is None, "O lead deletado não deveria ter sido ressuscitado pela mensagem de eco de saída"
    
    # Limpar a chave do Redis
    _redis_local.delete(f"webhook:resetting:{config.id}:{tel_teste}")

    # Limpeza pós-teste
    await db_session.execute(text(f"DELETE FROM {leads_table} WHERE telefone = :tel"), {"tel": tel_teste})
    await db_session.execute(text("DELETE FROM webhook_events WHERE telefone = :tel"), {"tel": tel_teste})
    await db_session.execute(text("DELETE FROM webhook_configs WHERE id = :id"), {"id": config.id})
    await db_session.commit()
