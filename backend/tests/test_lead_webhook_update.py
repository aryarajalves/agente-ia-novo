import pytest
import json
from datetime import datetime, timezone
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from webhooks.service import ensure_leads_table, upsert_lead
from models import WebhookConfigModel

@pytest.mark.asyncio
async def test_upsert_lead_updates_conversa_id(db_session: AsyncSession):
    """
    Valida se um lead existente que não possui conversa_id atualiza
    corretamente este campo ao receber uma nova mensagem pelo upsert_lead.
    """
    # 1. Garantir tabela de leads e criar config
    leads_table = "leads"
    await ensure_leads_table(leads_table)

    config = WebhookConfigModel(
        name="Webhook Teste Conversa ID",
        token="token_teste_conversa_id",
        leads_table=leads_table
    )
    db_session.add(config)
    await db_session.commit()
    await db_session.refresh(config)

    # Telefone de teste
    tel_teste = "5548999998888"

    # Limpar qualquer lead antigo do teste
    await db_session.execute(text(f"DELETE FROM {leads_table} WHERE telefone = :tel"), {"tel": tel_teste})
    await db_session.commit()

    # 2. Criar lead existente (sem conversa_id)
    await db_session.execute(text(f"""
        INSERT INTO {leads_table} (webhook_config_id, telefone, contato_nome, conversa_id)
        VALUES (:wid, :tel, :nome, NULL)
    """), {"wid": config.id, "tel": tel_teste, "nome": "Lead Sem Conversa"})
    await db_session.commit()

    # 3. Chamar upsert_lead simulando mensagem do cliente com conversa_id e labels
    data_mensagem = {
        "conta_id": "1",
        "inbox_id": "10",
        "inbox_nome": "WhatsApp",
        "conversa_id": "999888",
        "mensagem_id": "msg_123",
        "contato_id": "777",
        "telefone": tel_teste,
        "labels": json.dumps(["teste", "webhook"]),
        "contato_nome": "Lead Com Conversa Atualizada",
        "mensagem": "Olá, quero iniciar a automação",
        "message_type": "text",
        "dono": "cliente"
    }

    await upsert_lead(leads_table, data_mensagem, config.id)

    # 4. Validar se o conversa_id foi atualizado no banco
    res_lead = await db_session.execute(text(f"SELECT * FROM {leads_table} WHERE telefone = :tel"), {"tel": tel_teste})
    lead_row = res_lead.fetchone()
    assert lead_row is not None
    lead_dict = dict(lead_row._mapping)

    assert lead_dict["conversa_id"] == "999888"
    assert lead_dict["contato_nome"] == "Lead Com Conversa Atualizada"
    assert lead_dict["conta_id"] == "1"
    assert lead_dict["inbox_id"] == "10"
    assert lead_dict["inbox_nome"] == "WhatsApp"
    assert lead_dict["ultima_mensagem_em"] is not None

    # Limpeza
    await db_session.execute(text(f"DELETE FROM {leads_table} WHERE telefone = :tel"), {"tel": tel_teste})
    await db_session.execute(text("DELETE FROM webhook_configs WHERE id = :id"), {"id": config.id})
    await db_session.commit()
