import pytest
import json
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from models import WebhookConfigModel
from tasks import check_window_expiry
from database import SessionLocal
from webhooks.service import LEADS_TABLE_DDL

@pytest.mark.asyncio
async def test_check_window_expiry_timezone_naive(db_session: AsyncSession):
    """
    Testa a tarefa check_window_expiry para garantir que ela identifica corretamente
    leads que expiraram a janela de 24 horas e chama a API do Chatwoot para remover a etiqueta.
    """
    token = "test_token_window_expiry_111"
    leads_table = "leads"
    
    ddl = LEADS_TABLE_DDL
    if db_session.bind.dialect.name == "sqlite":
        ddl = ddl.replace("SERIAL PRIMARY KEY", "INTEGER PRIMARY KEY AUTOINCREMENT")
    await db_session.execute(text(f"DROP TABLE IF EXISTS {leads_table}"))
    await db_session.execute(text(ddl.format(table=leads_table)))
    await db_session.commit()
    
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

    await db_session.execute(text(f"DELETE FROM {leads_table} WHERE telefone = :tel"), {"tel": "5585999991111"})
    await db_session.commit()

    now_utc = datetime.utcnow()
    past_25h = now_utc - timedelta(hours=25)
    
    await db_session.execute(text(f"""
        INSERT INTO {leads_table} (
            webhook_config_id, conta_id, inbox_id, conversa_id, contato_id, 
            telefone, contato_nome, mensagem, ultima_mensagem_em, window_close_processed, labels
        ) VALUES (
            :config_id, '1', '10', '9999', '123', 
            '5585999991111', 'Cliente Expirado', 'Olá agente', :ult_msg, FALSE, :labels
        )
    """), {
        "config_id": config.id,
        "ult_msg": past_25h,
        "labels": json.dumps(["cliente", "24-horas", "urgente"])
    })
    await db_session.commit()

    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    
    mock_get_resp = MagicMock()
    mock_get_resp.status_code = 200
    mock_get_resp.json.return_value = {"payload": ["cliente", "24-horas", "urgente"]}
    mock_client.get.return_value = mock_get_resp

    mock_post_resp = MagicMock()
    mock_post_resp.status_code = 200
    mock_client.post.return_value = mock_post_resp

    with patch("tasks.httpx.Client", return_value=mock_client):
        check_window_expiry()

        mock_client.get.assert_called_with(
            "https://chat.test-window.com/api/v1/accounts/1/conversations/9999/labels",
            headers={"api_access_token": "test_api_token_cw_123"}
        )

        mock_client.post.assert_called_with(
            "https://chat.test-window.com/api/v1/accounts/1/conversations/9999/labels",
            json={"labels": ["cliente", "urgente"]},
            headers={"api_access_token": "test_api_token_cw_123"}
        )

    await db_session.rollback()
    res_lead = await db_session.execute(text(f"SELECT window_close_processed, labels FROM {leads_table} WHERE telefone = '5585999991111'"))
    row = res_lead.fetchone()
    assert bool(row[0]) is True
    assert json.loads(row[1]) == ["cliente", "urgente"]

    await db_session.execute(text(f"DELETE FROM {leads_table} WHERE telefone = :tel"), {"tel": "5585999991111"})
    await db_session.execute(text("DELETE FROM webhook_configs WHERE id = :id"), {"id": config.id})
    await db_session.commit()


@pytest.mark.asyncio
async def test_check_window_expiry_resilient_get_500(db_session: AsyncSession):
    """Se a busca de etiquetas falhar (500), o lead NÃO deve ser marcado como processado."""
    token = "test_token_resilience_get_500"
    leads_table = "leads"
    
    ddl = LEADS_TABLE_DDL
    if db_session.bind.dialect.name == "sqlite":
        ddl = ddl.replace("SERIAL PRIMARY KEY", "INTEGER PRIMARY KEY AUTOINCREMENT")
    await db_session.execute(text(f"DROP TABLE IF EXISTS {leads_table}"))
    await db_session.execute(text(ddl.format(table=leads_table)))
    await db_session.commit()
    
    config = WebhookConfigModel(
        name="Test Resilient Get 500",
        token=token,
        chatwoot_url="https://chat.test-window.com",
        chatwoot_api_token="test_api_token_cw_123",
        window_close_label=json.dumps(["24-horas"]),
        leads_table=leads_table
    )
    db_session.add(config)
    await db_session.commit()
    await db_session.refresh(config)

    await db_session.execute(text(f"DELETE FROM {leads_table} WHERE telefone = :tel"), {"tel": "5585999992222"})
    await db_session.commit()

    now_utc = datetime.utcnow()
    past_25h = now_utc - timedelta(hours=25)
    
    await db_session.execute(text(f"""
        INSERT INTO {leads_table} (
            webhook_config_id, conta_id, inbox_id, conversa_id, contato_id, 
            telefone, contato_nome, mensagem, ultima_mensagem_em, window_close_processed, labels
        ) VALUES (
            :config_id, '1', '10', '9992', '123', 
            '5585999992222', 'Cliente Expirado 500', 'Olá', :ult_msg, FALSE, :labels
        )
    """), {"config_id": config.id, "ult_msg": past_25h, "labels": json.dumps(["24-horas"])})
    await db_session.commit()

    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    
    mock_get_resp = MagicMock()
    mock_get_resp.status_code = 500
    mock_client.get.return_value = mock_get_resp

    with patch("tasks.httpx.Client", return_value=mock_client):
        check_window_expiry()

    await db_session.rollback()
    res_lead = await db_session.execute(text(f"SELECT window_close_processed, labels FROM {leads_table} WHERE telefone = '5585999992222'"))
    row = res_lead.fetchone()
    assert bool(row[0]) is False, "O lead não deveria ser marcado como processado após erro 500 no GET"
    assert json.loads(row[1]) == ["24-horas"], "A label local não deveria ter mudado"

    await db_session.execute(text(f"DELETE FROM {leads_table} WHERE telefone = :tel"), {"tel": "5585999992222"})
    await db_session.execute(text("DELETE FROM webhook_configs WHERE id = :id"), {"id": config.id})
    await db_session.commit()


@pytest.mark.asyncio
async def test_check_window_expiry_resilient_post_500(db_session: AsyncSession):
    """Se a remoção de etiquetas falhar (500), o lead NÃO deve ser marcado como processado."""
    token = "test_token_resilience_post_500"
    leads_table = "leads"
    
    ddl = LEADS_TABLE_DDL
    if db_session.bind.dialect.name == "sqlite":
        ddl = ddl.replace("SERIAL PRIMARY KEY", "INTEGER PRIMARY KEY AUTOINCREMENT")
    await db_session.execute(text(f"DROP TABLE IF EXISTS {leads_table}"))
    await db_session.execute(text(ddl.format(table=leads_table)))
    await db_session.commit()
    
    config = WebhookConfigModel(
        name="Test Resilient Post 500",
        token=token,
        chatwoot_url="https://chat.test-window.com",
        chatwoot_api_token="test_api_token_cw_123",
        window_close_label=json.dumps(["24-horas"]),
        leads_table=leads_table
    )
    db_session.add(config)
    await db_session.commit()
    await db_session.refresh(config)

    await db_session.execute(text(f"DELETE FROM {leads_table} WHERE telefone = :tel"), {"tel": "5585999993333"})
    await db_session.commit()

    now_utc = datetime.utcnow()
    past_25h = now_utc - timedelta(hours=25)
    
    await db_session.execute(text(f"""
        INSERT INTO {leads_table} (
            webhook_config_id, conta_id, inbox_id, conversa_id, contato_id, 
            telefone, contato_nome, mensagem, ultima_mensagem_em, window_close_processed, labels
        ) VALUES (
            :config_id, '1', '10', '9993', '123', 
            '5585999993333', 'Cliente Expirado Post 500', 'Olá', :ult_msg, FALSE, :labels
        )
    """), {"config_id": config.id, "ult_msg": past_25h, "labels": json.dumps(["24-horas"])})
    await db_session.commit()

    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    
    mock_get_resp = MagicMock()
    mock_get_resp.status_code = 200
    mock_get_resp.json.return_value = {"payload": ["24-horas"]}
    mock_client.get.return_value = mock_get_resp

    mock_post_resp = MagicMock()
    mock_post_resp.status_code = 500
    mock_client.post.return_value = mock_post_resp

    with patch("tasks.httpx.Client", return_value=mock_client):
        check_window_expiry()

    await db_session.rollback()
    res_lead = await db_session.execute(text(f"SELECT window_close_processed, labels FROM {leads_table} WHERE telefone = '5585999993333'"))
    row = res_lead.fetchone()
    assert bool(row[0]) is False, "O lead não deveria ser marcado como processado após erro 500 no POST"
    assert json.loads(row[1]) == ["24-horas"], "A label local não deveria ter mudado"

    await db_session.execute(text(f"DELETE FROM {leads_table} WHERE telefone = :tel"), {"tel": "5585999993333"})
    await db_session.execute(text("DELETE FROM webhook_configs WHERE id = :id"), {"id": config.id})
    await db_session.commit()


@pytest.mark.asyncio
async def test_check_window_expiry_resilient_404(db_session: AsyncSession):
    """Se a conversa retornar 404 (não encontrada), o lead deve ser marcado como processado."""
    token = "test_token_resilience_404"
    leads_table = "leads"
    
    ddl = LEADS_TABLE_DDL
    if db_session.bind.dialect.name == "sqlite":
        ddl = ddl.replace("SERIAL PRIMARY KEY", "INTEGER PRIMARY KEY AUTOINCREMENT")
    await db_session.execute(text(f"DROP TABLE IF EXISTS {leads_table}"))
    await db_session.execute(text(ddl.format(table=leads_table)))
    await db_session.commit()
    
    config = WebhookConfigModel(
        name="Test Resilient 404",
        token=token,
        chatwoot_url="https://chat.test-window.com",
        chatwoot_api_token="test_api_token_cw_123",
        window_close_label=json.dumps(["24-horas"]),
        leads_table=leads_table
    )
    db_session.add(config)
    await db_session.commit()
    await db_session.refresh(config)

    await db_session.execute(text(f"DELETE FROM {leads_table} WHERE telefone = :tel"), {"tel": "5585999994444"})
    await db_session.commit()

    now_utc = datetime.utcnow()
    past_25h = now_utc - timedelta(hours=25)
    
    await db_session.execute(text(f"""
        INSERT INTO {leads_table} (
            webhook_config_id, conta_id, inbox_id, conversa_id, contato_id, 
            telefone, contato_nome, mensagem, ultima_mensagem_em, window_close_processed, labels
        ) VALUES (
            :config_id, '1', '10', '9994', '123', 
            '5585999994444', 'Cliente Expirado 404', 'Olá', :ult_msg, FALSE, :labels
        )
    """), {"config_id": config.id, "ult_msg": past_25h, "labels": json.dumps(["24-horas", "humano"])})
    await db_session.commit()

    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    
    mock_get_resp = MagicMock()
    mock_get_resp.status_code = 404
    mock_client.get.return_value = mock_get_resp

    with patch("tasks.httpx.Client", return_value=mock_client):
        check_window_expiry()

    await db_session.rollback()
    res_lead = await db_session.execute(text(f"SELECT window_close_processed, labels FROM {leads_table} WHERE telefone = '5585999994444'"))
    row = res_lead.fetchone()
    assert bool(row[0]) is True, "O lead deveria ser marcado como processado se retornar 404 no Chatwoot"
    assert json.loads(row[1]) == ["humano"], "A etiqueta de 24h deve ser removida localmente mesmo no 404"

    await db_session.execute(text(f"DELETE FROM {leads_table} WHERE telefone = :tel"), {"tel": "5585999994444"})
    await db_session.execute(text("DELETE FROM webhook_configs WHERE id = :id"), {"id": config.id})
    await db_session.commit()


@pytest.mark.asyncio
async def test_check_window_expiry_resilient_no_label_needed(db_session: AsyncSession):
    """Se a conversa já não tiver a etiqueta configurada para remoção, deve ser marcado como processado sem POST."""
    token = "test_token_resilience_no_label"
    leads_table = "leads"
    
    ddl = LEADS_TABLE_DDL
    if db_session.bind.dialect.name == "sqlite":
        ddl = ddl.replace("SERIAL PRIMARY KEY", "INTEGER PRIMARY KEY AUTOINCREMENT")
    await db_session.execute(text(f"DROP TABLE IF EXISTS {leads_table}"))
    await db_session.execute(text(ddl.format(table=leads_table)))
    await db_session.commit()
    
    config = WebhookConfigModel(
        name="Test Resilient No Label Needed",
        token=token,
        chatwoot_url="https://chat.test-window.com",
        chatwoot_api_token="test_api_token_cw_123",
        window_close_label=json.dumps(["24-horas"]),
        leads_table=leads_table
    )
    db_session.add(config)
    await db_session.commit()
    await db_session.refresh(config)

    await db_session.execute(text(f"DELETE FROM {leads_table} WHERE telefone = :tel"), {"tel": "5585999995555"})
    await db_session.commit()

    now_utc = datetime.utcnow()
    past_25h = now_utc - timedelta(hours=25)
    
    await db_session.execute(text(f"""
        INSERT INTO {leads_table} (
            webhook_config_id, conta_id, inbox_id, conversa_id, contato_id, 
            telefone, contato_nome, mensagem, ultima_mensagem_em, window_close_processed, labels
        ) VALUES (
            :config_id, '1', '10', '9995', '123', 
            '5585999995555', 'Cliente Expirado Sem Label', 'Olá', :ult_msg, FALSE, :labels
        )
    """), {"config_id": config.id, "ult_msg": past_25h, "labels": json.dumps(["24-horas", "humano", "outra-label"])})
    await db_session.commit()

    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    
    mock_get_resp = MagicMock()
    mock_get_resp.status_code = 200
    mock_get_resp.json.return_value = {"payload": ["outra-label", "humano"]}
    mock_client.get.return_value = mock_get_resp

    with patch("tasks.httpx.Client", return_value=mock_client):
        check_window_expiry()
        
        # O post NÃO deve ser chamado
        mock_client.post.assert_not_called()

    await db_session.rollback()
    res_lead = await db_session.execute(text(f"SELECT window_close_processed, labels FROM {leads_table} WHERE telefone = '5585999995555'"))
    row = res_lead.fetchone()
    assert bool(row[0]) is True, "O lead deveria ser marcado como processado, pois a etiqueta já não existia"
    assert json.loads(row[1]) == ["outra-label", "humano"], "A coluna labels deve ser atualizada para refletir o Chatwoot sem a tag 24h"

    await db_session.execute(text(f"DELETE FROM {leads_table} WHERE telefone = :tel"), {"tel": "5585999995555"})
    await db_session.execute(text("DELETE FROM webhook_configs WHERE id = :id"), {"id": config.id})
    await db_session.commit()
