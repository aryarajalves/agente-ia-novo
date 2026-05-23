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
    qualified_by_agent_id INTEGER,
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
    respostas_qualificacao TEXT,
    lead_score INTEGER,
    lead_classification VARCHAR(50),
    lead_justification TEXT,
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
            "inbox_nome VARCHAR",
            "respostas_qualificacao TEXT",
            "lead_score INTEGER",
            "lead_classification VARCHAR(50)",
            "lead_justification TEXT",
            "qualified_by_agent_id INTEGER"
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
                        conversa_id = :conversa_id,
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
                        conversa_id = :conversa_id,
                        mensagem_id = :mensagem_id, contato_id = :contato_id,
                        labels = :labels, contato_nome = :contato_nome,
                        mensagem = :mensagem, message_type = :message_type, link = :link,
                        ultima_mensagem_em = :now_utc, window_close_processed = FALSE,
                        followup_step = 0, updated_at = :now_utc
                    WHERE id = :id
                """), {**data, "id": row[0], "now_utc": now_utc})
        else:
            logger.info(f"🆕 Inserindo NOVO lead na tabela {table_name}: {phone_raw} (is_agent={is_agent})")
            if is_agent:
                # Criando lead a partir de uma mensagem enviada pelo agente (disparo ativo)
                await conn.execute(text(f"""
                    INSERT INTO {table_name}
                        (webhook_config_id, conta_id, inbox_id, inbox_nome, conversa_id,
                         mensagem_id, contato_id, telefone, labels, contato_nome, ultima_resposta_agente,
                         ultima_resposta_agente_em, message_type, link, pode_enviar_mensagem,
                         ultima_mensagem_em, updated_at, created_at)
                    VALUES
                        (:webhook_config_id, :conta_id, :inbox_id, :inbox_nome, :conversa_id,
                         :mensagem_id, :contato_id, :telefone, :labels, :contato_nome, :mensagem,
                         :now_utc, :message_type, :link, TRUE,
                         NULL, :now_utc, :now_utc)
                """), {"webhook_config_id": webhook_config_id, "now_utc": now_utc, **data})
            else:
                # Criando lead a partir de uma mensagem enviada pelo cliente (recebimento)
                await conn.execute(text(f"""
                    INSERT INTO {table_name}
                        (webhook_config_id, conta_id, inbox_id, inbox_nome, conversa_id,
                         mensagem_id, contato_id, telefone, labels, contato_nome, mensagem,
                         message_type, link, pode_enviar_mensagem,
                         ultima_mensagem_em, updated_at, created_at)
                    VALUES
                        (:webhook_config_id, :conta_id, :inbox_id, :inbox_nome, :conversa_id,
                         :mensagem_id, :contato_id, :telefone, :labels, :contato_nome, :mensagem,
                         :message_type, :link, TRUE,
                         :now_utc, :now_utc, :now_utc)
                """), {"webhook_config_id": webhook_config_id, "now_utc": now_utc, **data})
            logger.info(f"✅ Lead {phone_raw} inserido com sucesso em {table_name}.")


async def delete_contact_data(db: AsyncSession, webhook_id: int, table_name: str, phones: list, lead_ids: list = None):
    """Remove todos os dados de um contato (Logs, Memória, Sumários, Gatilhos) de todas as plataformas."""
    if not phones and not lead_ids: 
        logger.info("Nenhum telefone ou lead_id fornecido para deleção.")
        return
        
    logger.info(f"🗑️ Iniciando limpeza cross-platform de dados para {len(phones)} telefones e {len(lead_ids or [])} IDs")
    
    suffixes = [p[-8:] for p in phones if p and len(p) >= 8]
    
    # 1. Coletar IDs de leads e telefones de todas as tabelas cadastradas no sistema
    all_lead_ids = []
    if lead_ids:
        all_lead_ids.extend([str(lid) for lid in lead_ids])
        
    try:
        res_tables = await db.execute(text("SELECT DISTINCT leads_table FROM webhook_configs WHERE leads_table IS NOT NULL AND leads_table != ''"))
        all_tables = [r[0] for r in res_tables.fetchall()]
    except Exception as e_tables:
        logger.warning(f"Erro ao obter leads_tables: {e_tables}")
        all_tables = [table_name] if table_name else []

    if table_name and table_name not in all_tables:
        all_tables.append(table_name)

    # 2. Remover o registro do lead e obter IDs de todas as tabelas de leads
    if phones:
        for t in all_tables:
            try:
                async with db.begin_nested():
                    where_tbl = "(telefone = ANY(:tels)"
                    params_tbl = {"tels": phones}
                    if suffixes:
                        where_tbl += " OR RIGHT(telefone, 8) = ANY(:suffixes)"
                        params_tbl["suffixes"] = suffixes
                    where_tbl += ")"
                    
                    # Selecionar IDs de leads antes de excluir para limpar memórias e logs atrelados
                    res_ids = await db.execute(text(f"SELECT id FROM {t} WHERE {where_tbl}"), params_tbl)
                    found_ids = [str(r[0]) for r in res_ids.fetchall() if r[0]]
                    all_lead_ids.extend(found_ids)
                    
                    # Deletar o lead
                    del_res = await db.execute(text(f"DELETE FROM {t} WHERE {where_tbl}"), params_tbl)
                    logger.info(f"✅ {del_res.rowcount} leads removidos da tabela {t}.")
            except Exception as e_del_tbl:
                logger.warning(f"Erro ao processar limpeza da tabela {t}: {e_del_tbl}")
                
    elif lead_ids:
        # Se veio apenas lead_ids (sem telefones), deletar da tabela principal informada
        try:
            async with db.begin_nested():
                del_res = await db.execute(text(f"DELETE FROM {table_name} WHERE id = ANY(:ids)"), {"ids": lead_ids})
                logger.info(f"✅ {del_res.rowcount} leads removidos por ID da tabela {table_name}.")
        except Exception as e_del_ids:
            logger.warning(f"Erro ao deletar lead_ids do table_name: {e_del_ids}")

    # 3. Limpar eventos de webhook se houver telefones
    if phones:
        where_events = "(telefone = ANY(:tels)"
        params_events = {"tels": phones}
        if suffixes:
            where_events += " OR RIGHT(telefone, 8) = ANY(:suffixes)"
            params_events["suffixes"] = suffixes
        where_events += ")"
        
        evt_res = await db.execute(text(f"DELETE FROM webhook_events WHERE {where_events}"), params_events)
        logger.info(f"✅ {evt_res.rowcount} eventos removidos de todas as plataformas.")
        
        # O sync_memory_to_vector salva com prefixo 'phone:' (ex: phone:5511999998888)
        tels_with_prefix = [f"phone:{p}" for p in phones if p]
        all_meta_vals = phones + tels_with_prefix
        await db.execute(text("DELETE FROM knowledge_items WHERE metadata_val = ANY(:metas)"), {"metas": all_meta_vals})
        
        # Limpar triggers
        where_trig = "contact_phone = ANY(:tels)"
        params_trig = {"tels": phones}
        if suffixes:
            where_trig += " OR RIGHT(contact_phone, 8) = ANY(:suffixes)"
            params_trig["suffixes"] = suffixes
            
        trig_res = await db.execute(text(f"SELECT id FROM scheduled_triggers WHERE {where_trig}"), params_trig)
        trig_ids = [r[0] for r in trig_res.fetchall()]
        
        if trig_ids:
            ms_res = await db.execute(text("DELETE FROM message_status WHERE trigger_id = ANY(:ids)"), {"ids": trig_ids})
            st_res = await db.execute(text("DELETE FROM scheduled_triggers WHERE id = ANY(:ids)"), {"ids": trig_ids})
            logger.info(f"✅ {st_res.rowcount} triggers agendados e {ms_res.rowcount} status de mensagem removidos.")

    # 4. Limpar memórias, sumários e logs de interação (usando telefones, telefones com prefixo 'tel_' e IDs coletados)
    tels_with_prefix_tel = [f"tel_{p}" for p in phones] if phones else []
    all_keys = (phones or []) + tels_with_prefix_tel + all_lead_ids
    all_keys = list(dict.fromkeys(all_keys)) # remover duplicados
    
    if all_keys:
        await db.execute(text("DELETE FROM user_memory WHERE session_id = ANY(:keys)"), {"keys": all_keys})
        await db.execute(text("DELETE FROM session_summaries WHERE session_id = ANY(:keys)"), {"keys": all_keys})
        await db.execute(text("DELETE FROM interaction_logs WHERE session_id = ANY(:keys)"), {"keys": all_keys})
        logger.info("✅ Memórias, sumários e logs de interação de todas as plataformas removidos.")

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
