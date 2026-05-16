from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta
import logging
import json
import httpx
import re
import os
import tempfile
from database import engine
from .utils import normalize_phone, get_phone_suffix, get_value_by_path
from models import WebhookEventModel

logger = logging.getLogger(__name__)

LEADS_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS {table} (
    id SERIAL PRIMARY KEY,
    webhook_config_id INTEGER,
    conta_id VARCHAR,
    inbox_id VARCHAR,
    inbox_nome VARCHAR,
    conversa_id VARCHAR,
    mensagem_id VARCHAR,
    contato_id VARCHAR,
    telefone VARCHAR,
    labels TEXT,
    contato_nome VARCHAR,
    mensagem TEXT,
    message_type VARCHAR(50) DEFAULT 'text',
    link TEXT,
    pode_enviar_mensagem BOOLEAN DEFAULT TRUE,
    ultima_mensagem_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    window_close_processed BOOLEAN DEFAULT FALSE,
    followup_step INTEGER DEFAULT 0,
    ultima_resposta_agente TEXT,
    ultima_resposta_agente_em TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
"""

async def ensure_leads_table(table_name: str):
    """Garante a existência da tabela de leads e suas colunas (migração automática)."""
    async with engine.begin() as conn:
        await conn.execute(text(LEADS_TABLE_DDL.format(table=table_name)))
        migrations = [
            "pode_enviar_mensagem BOOLEAN DEFAULT TRUE",
            "ultima_mensagem_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
            "window_close_processed BOOLEAN DEFAULT FALSE",
            "followup_step INTEGER DEFAULT 0",
            "ultima_resposta_agente TEXT",
            "ultima_resposta_agente_em TIMESTAMP",
            "link TEXT",
            "message_type VARCHAR(50) DEFAULT 'text'",
            "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
            "conta_id VARCHAR",
            "inbox_id VARCHAR",
            "conversa_id VARCHAR",
            "contato_id VARCHAR",
            "inbox_nome VARCHAR"
        ]
        for mig in migrations:
            await conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {mig}"))

async def upsert_lead(table_name: str, data: dict, webhook_config_id: int):
    """Insere ou atualiza lead considerando o telefone e sufixos."""
    # Garante todos os campos padrão para evitar erros de bind parameter no SQLAlchemy
    default_fields = {
        "conta_id": None,
        "inbox_id": None,
        "inbox_nome": None,
        "conversa_id": None,
        "mensagem_id": None,
        "contato_id": None,
        "telefone": None,
        "labels": "[]",
        "contato_nome": None,
        "mensagem": None,
        "message_type": "text",
        "link": None,
        "dono": "cliente"
    }
    data = {**default_fields, **data}

    is_agent = data.get("dono") == "agente"
    phone_raw = data.get("telefone")
    phone_clean = normalize_phone(phone_raw)
    tel_suffix = get_phone_suffix(phone_clean)

    async with engine.begin() as conn:
        existing = await conn.execute(text(f"""
            SELECT id FROM {table_name} 
            WHERE webhook_config_id = :webhook_config_id
            AND (telefone = :telefone OR telefone LIKE '%' || :tel_suffix || '%')
            ORDER BY LENGTH(telefone) DESC
            LIMIT 1
        """), {
            "telefone": phone_raw, 
            "webhook_config_id": webhook_config_id,
            "tel_suffix": tel_suffix
        })
        row = existing.fetchone()

        now_utc = datetime.utcnow()
        if row:
            if is_agent:
                two_min_ago = now_utc - timedelta(seconds=120)
                await conn.execute(text(f"""
                    UPDATE {table_name} SET
                        telefone = :telefone, conta_id = :conta_id,
                        inbox_id = :inbox_id, inbox_nome = :inbox_nome,
                        mensagem_id = :mensagem_id, contato_id = :contato_id,
                        labels = :labels, contato_nome = :contato_nome, 
                        message_type = :message_type, link = :link,
                        ultima_resposta_agente = CASE 
                            WHEN ultima_resposta_agente_em IS NOT NULL AND ultima_resposta_agente_em > :two_min_ago
                                 AND LENGTH(ultima_resposta_agente) > LENGTH(:mensagem)
                            THEN ultima_resposta_agente ELSE :mensagem
                        END,
                        ultima_resposta_agente_em = COALESCE(
                            CASE WHEN ultima_resposta_agente_em IS NOT NULL AND ultima_resposta_agente_em > :two_min_ago
                                      AND LENGTH(ultima_resposta_agente) > LENGTH(:mensagem)
                                 THEN ultima_resposta_agente_em
                            END, :now_utc
                        ),
                        updated_at = :now_utc
                    WHERE id = :id
                """), {**data, "id": row[0], "now_utc": now_utc, "two_min_ago": two_min_ago})
            else:
                await conn.execute(text(f"""
                    UPDATE {table_name} SET
                        telefone = :telefone, conta_id = :conta_id,
                        inbox_id = :inbox_id, inbox_nome = :inbox_nome,
                        mensagem_id = :mensagem_id, contato_id = :contato_id,
                        labels = :labels, contato_nome = :contato_nome,
                        mensagem = :mensagem, message_type = :message_type, link = :link,
                        ultima_mensagem_em = :now_utc, window_close_processed = FALSE,
                        followup_step = 0, updated_at = :now_utc
                    WHERE id = :id
                """), {**data, "id": row[0], "now_utc": now_utc})
        elif not is_agent:
            logger.info(f"🆕 Inserindo NOVO lead na tabela {table_name}: {phone_raw}")
            await conn.execute(text(f"""
                INSERT INTO {table_name}
                    (webhook_config_id, conta_id, inbox_id, inbox_nome, conversa_id,
                     mensagem_id, contato_id, telefone, labels, contato_nome, mensagem, message_type, link,
                     pode_enviar_mensagem, ultima_mensagem_em, updated_at, created_at)
                VALUES
                    (:webhook_config_id, :conta_id, :inbox_id, :inbox_nome, :conversa_id,
                     :mensagem_id, :contato_id, :telefone, :labels, :contato_nome, :mensagem, :message_type, :link,
                     TRUE, :now_utc, :now_utc, :now_utc)
            """), {"webhook_config_id": webhook_config_id, "now_utc": now_utc, **data})
            logger.info(f"✅ Lead {phone_raw} inserido com sucesso em {table_name}.")


async def delete_contact_data(db: AsyncSession, webhook_id: int, table_name: str, phones: list, lead_ids: list = None):
    """Remove todos os dados de um contato (Logs, Memória, Sumários, Gatilhos)."""
    if not phones and not lead_ids: 
        logger.info("Nenhum telefone ou lead_id fornecido para deleção.")
        return
        
    logger.info(f"🗑️ Iniciando limpeza de dados para {len(phones)} telefones e {len(lead_ids or [])} IDs no webhook {webhook_id}")
    
    suffixes = [p[-8:] for p in phones if p and len(p) >= 8]
    
    # 1. Limpar eventos se houver telefones
    if phones:
        where_events = "(telefone = ANY(:tels)"
        params_events = {"wid": webhook_id, "tels": phones}
        if suffixes:
            where_events += " OR RIGHT(telefone, 8) = ANY(:suffixes)"
            params_events["suffixes"] = suffixes
        where_events += ")"
        
        evt_res = await db.execute(text(f"DELETE FROM webhook_events WHERE webhook_config_id = :wid AND {where_events}"), params_events)
        logger.info(f"✅ {evt_res.rowcount} eventos removidos.")
        
        # Limpar memórias e logs
        await db.execute(text("DELETE FROM user_memory WHERE session_id = ANY(:tels)"), {"tels": phones})
        await db.execute(text("DELETE FROM session_summaries WHERE session_id = ANY(:tels)"), {"tels": phones})
        await db.execute(text("DELETE FROM interaction_logs WHERE session_id = ANY(:tels)"), {"tels": phones})
        await db.execute(text("DELETE FROM knowledge_items WHERE metadata_val = ANY(:tels)"), {"tels": phones})
        logger.info("✅ Memórias, sumários e logs limpos.")
        
        # Limpar triggers
        where_trig = "contact_phone = ANY(:tels)"
        params_trig = {"tels": phones}
        if suffixes:
            where_trig += " OR RIGHT(contact_phone, 8) = ANY(:suffixes)"
            params_trig["suffixes"] = suffixes
            
        trig_res = await db.execute(text(f"SELECT id FROM scheduled_triggers WHERE {where_trig}"), params_trig)
        trig_ids = [r[0] for r in trig_res.fetchall()]
        
        if trig_ids:
            # Garante que message_status seja limpo antes (embora haja CASCADE, ser explícito ajuda no log)
            ms_res = await db.execute(text("DELETE FROM message_status WHERE trigger_id = ANY(:ids)"), {"ids": trig_ids})
            st_res = await db.execute(text("DELETE FROM scheduled_triggers WHERE id = ANY(:ids)"), {"ids": trig_ids})
            logger.info(f"✅ {st_res.rowcount} triggers agendados e {ms_res.rowcount} status de mensagem removidos.")
        else:
            logger.info("ℹ️ Nenhum trigger agendado encontrado para este contato.")

    # 2. Remover o lead propriamente dito
    if lead_ids:
        lead_res = await db.execute(text(f"DELETE FROM {table_name} WHERE id = ANY(:ids) AND webhook_config_id = :wid"), {"ids": lead_ids, "wid": webhook_id})
        logger.info(f"✅ {lead_res.rowcount} leads removidos por ID da tabela {table_name}.")
    elif phones:
        # Se não temos IDs, mas temos telefones, deletamos por telefone (fallback)
        where_leads = "(telefone = ANY(:tels)"
        if suffixes:
            where_leads += " OR RIGHT(telefone, 8) = ANY(:suffixes)"
        where_leads += ")"
        lead_res = await db.execute(text(f"DELETE FROM {table_name} WHERE {where_leads} AND webhook_config_id = :wid"), {"tels": phones, "suffixes": suffixes, "wid": webhook_id})
        logger.info(f"✅ {lead_res.rowcount} leads removidos por Telefone da tabela {table_name}.")

async def handle_keyword_handoffs(db: AsyncSession, config, event, extracted: dict, cw_url_default: str, cw_token_default: str):
    """Lógica de transbordo por palavra-chave."""
    msg_clean = (extracted.get("mensagem") or "").strip().lower()
    if not msg_clean: return False
    action_type = None
    if config.handoff_keyword and msg_clean == config.handoff_keyword.strip().lower():
        action_type, l_add, l_rem, c_msg = "human", config.handoff_labels_to_add, config.handoff_labels_to_remove, config.handoff_message
    elif config.ai_handoff_keyword and msg_clean == config.ai_handoff_keyword.strip().lower():
        action_type, l_add, l_rem, c_msg = "ai", config.ai_handoff_labels_to_add, config.ai_handoff_labels_to_remove, config.ai_handoff_message
    
    if action_type:
        l_add = json.loads(l_add or "[]"); l_rem = json.loads(l_rem or "[]")
        cw_url = (config.chatwoot_url or cw_url_default).rstrip("/")
        cw_token = config.chatwoot_api_token or cw_token_default
        if cw_url and cw_token and extracted.get("conversa_id") and extracted.get("conta_id"):
            async with httpx.AsyncClient(timeout=10) as client:
                base_url = f"{cw_url}/api/v1/accounts/{extracted['conta_id']}/conversations/{extracted['conversa_id']}"
                headers = {"api_access_token": cw_token}
                try:
                    r = await client.get(f"{base_url}/labels", headers=headers)
                    curr = r.json().get("payload", []) if r.status_code == 200 else []
                    final = list(set([l for l in curr if l not in l_rem] + l_add))
                    await client.post(f"{base_url}/labels", json={"labels": final}, headers=headers)
                except: pass
                if c_msg:
                    try: await client.post(f"{base_url}/messages", json={"content": c_msg, "message_type": "outgoing"}, headers=headers)
                    except: pass
        return True
    return False
