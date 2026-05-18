import pytest
import json
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from models import WebhookConfigModel
from tasks import check_window_expiry
from database import SessionLocal

@pytest.mark.asyncio
async def test_check_window_expiry_timezone_naive(db_session: AsyncSession):
    """
    Testa a tarefa check_window_expiry para garantir que ela identifica corretamente
    leads que expiraram a janela de 24 horas (salvos com UTC naive no Python)
    e chama a API do Chatwoot para remover a etiqueta configurada.
    """
    
    # 1. Configurar Webhook e Leads de Teste
    token = "test_token_window_expiry_111"
    leads_table = "leads"
    
    config = WebhookConfigModel(
        name="Test Window Expiry Webhook",
        token=token,
        chatwoot_url="https://chat.test-window.com",
        chatwoot_api_token="test_api_token_cw_123",
        window_close_label=json.dumps(["24-horas"]),
        leads_table=leads_table
    )
    db_session.add(config)
    await db_session.commit()
    await db_session.refresh(config)

    # Limpar qualquer lead de teste antigo que possa ter ficado no banco local
    await db_session.execute(text(f"DELETE FROM {leads_table} WHERE telefone = :tel"), {"tel": "5585999991111"})
    await db_session.commit()

    # Criar um lead com última mensagem há 25 horas (excedeu a janela de 24 horas)
    now_utc = datetime.utcnow()
    past_25h = now_utc - timedelta(hours=25)
    
    # Inserir lead de teste expirado
    await db_session.execute(text(f"""
        INSERT INTO {leads_table} (
            webhook_config_id, conta_id, inbox_id, conversa_id, contato_id, 
            telefone, contato_nome, mensagem, ultima_mensagem_em, window_close_processed
        ) VALUES (
            :config_id, '1', '10', '9999', '123', 
            '5585999991111', 'Cliente Expirado', 'Olá agente', :ult_msg, FALSE
        )
    """), {
        "config_id": config.id,
        "ult_msg": past_25h
    })
    await db_session.commit()

    # 2. Mockar httpx.Client para simular o Chatwoot
    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    
    # Mock para o GET /labels
    mock_get_resp = MagicMock()
    mock_get_resp.status_code = 200
    mock_get_resp.json.return_value = {"payload": ["cliente", "24-horas", "urgente"]}
    mock_client.get.return_value = mock_get_resp

    # Mock para o POST /labels
    mock_post_resp = MagicMock()
    mock_post_resp.status_code = 200
    mock_client.post.return_value = mock_post_resp

    with patch("tasks.httpx.Client", return_value=mock_client):
        # 3. Rodar a tarefa síncrona do Celery (no mesmo processo e banco de dados)
        check_window_expiry()

        # 4. Validar se a chamada HTTP do GET foi feita corretamente
        mock_client.get.assert_called_with(
            "https://chat.test-window.com/api/v1/accounts/1/conversations/9999/labels",
            headers={"api_access_token": "test_api_token_cw_123"}
        )

        # 5. Validar se o POST removeu apenas a etiqueta '24-horas'
        mock_client.post.assert_called_with(
            "https://chat.test-window.com/api/v1/accounts/1/conversations/9999/labels",
            json={"labels": ["cliente", "urgente"]},
            headers={"api_access_token": "test_api_token_cw_123"}
        )

    # 6. Validar se o lead foi atualizado no banco para window_close_processed = TRUE
    res_lead = await db_session.execute(text(f"""
        SELECT window_close_processed FROM {leads_table} WHERE telefone = '5585999991111'
    """))
    processed_status = res_lead.scalar()
    assert processed_status is True, "O lead expirado deveria ter sido marcado como processado (window_close_processed = True)"

    # 7. Limpeza pós-teste
    await db_session.execute(text(f"DELETE FROM {leads_table} WHERE telefone = :tel"), {"tel": "5585999991111"})
    await db_session.execute(text("DELETE FROM webhook_configs WHERE id = :id"), {"id": config.id})
    await db_session.commit()
