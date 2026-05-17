import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from webhooks.service import delete_contact_data

@pytest.mark.asyncio
async def test_cross_platform_contact_deletion(db_session: AsyncSession):
    # 1. Setup: Criar webhook configs e eventos de webhook para o mesmo telefone em 2 webhooks diferentes
    telefone_teste = "5511999998888"

    # Garantir que a tabela temporária exista
    table_name = "webhook_leads_1"
    await db_session.execute(text(f"""
        CREATE TABLE IF NOT EXISTS {table_name} (
            id SERIAL PRIMARY KEY,
            webhook_config_id INTEGER,
            telefone VARCHAR,
            contato_nome VARCHAR,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """))
    await db_session.commit()

    # Limpar qualquer dado anterior deste telefone, tokens, configs e itens de conhecimento para isolar o teste
    await db_session.execute(text("DELETE FROM webhook_configs WHERE token IN ('token_cross_1', 'token_cross_2')"))
    await db_session.execute(text(f"DELETE FROM {table_name} WHERE telefone = :tel"), {"tel": telefone_teste})
    await db_session.execute(text("DELETE FROM webhook_events WHERE telefone = :tel"), {"tel": telefone_teste})
    await db_session.execute(text("DELETE FROM knowledge_items WHERE metadata_val IN (:tel, :prefix_tel)"), {"tel": telefone_teste, "prefix_tel": f"phone:{telefone_teste}"})
    await db_session.commit()

    # Inserir webhook configs de teste com RETURNING id
    res1 = await db_session.execute(text("""
        INSERT INTO webhook_configs (name, token, leads_table) 
        VALUES ('Webhook Teste 1', 'token_cross_1', :table) RETURNING id
    """), {"table": table_name})
    webhook1_id = res1.scalar()

    res2 = await db_session.execute(text("""
        INSERT INTO webhook_configs (name, token, leads_table) 
        VALUES ('Webhook Teste 2', 'token_cross_2', :table) RETURNING id
    """), {"table": table_name})
    webhook2_id = res2.scalar()
    await db_session.commit()

    # Inserir lead no webhook 1
    await db_session.execute(text(f"""
        INSERT INTO {table_name} (webhook_config_id, telefone, contato_nome) 
        VALUES (:wid, :tel, 'Contato Teste Cruzado')
    """), {"wid": webhook1_id, "tel": telefone_teste})
    await db_session.commit()

    # Obter o id do lead criado
    res_lead = await db_session.execute(text(f"SELECT id FROM {table_name} WHERE telefone = :tel"), {"tel": telefone_teste})
    lead_id = res_lead.scalar()

    # Inserir eventos de webhook em ambas as plataformas (webhook 1 e webhook 2)
    await db_session.execute(text("""
        INSERT INTO webhook_events (webhook_config_id, telefone, event_type, status) 
        VALUES (:wid, :tel, 'whatsapp', 'completed')
    """), {"wid": webhook1_id, "tel": telefone_teste})
    
    await db_session.execute(text("""
        INSERT INTO webhook_events (webhook_config_id, telefone, event_type, status) 
        VALUES (:wid, :tel, 'memory', 'success')
    """), {"wid": webhook2_id, "tel": telefone_teste})
    
    # Obter ou criar uma base de conhecimento válida
    res_kb = await db_session.execute(text("SELECT id FROM knowledge_bases LIMIT 1"))
    kb_id = res_kb.scalar()
    if not kb_id:
        res_kb_new = await db_session.execute(text("""
            INSERT INTO knowledge_bases (name) VALUES ('KB Teste') RETURNING id
        """))
        kb_id = res_kb_new.scalar()
        
    # Inserir itens de conhecimento estruturados para este telefone (com e sem prefixo 'phone:')
    await db_session.execute(text("""
        INSERT INTO knowledge_items (knowledge_base_id, question, answer, metadata_val) 
        VALUES (:kb_id, 'curso de lead', 'Protocolo de Reprogramacao', :tel)
    """), {"kb_id": kb_id, "tel": telefone_teste})
    
    await db_session.execute(text("""
        INSERT INTO knowledge_items (knowledge_base_id, question, answer, metadata_val) 
        VALUES (:kb_id, 'produto comprado', 'Desbloqueio Neural de 24hrs', :prefix_tel)
    """), {"kb_id": kb_id, "prefix_tel": f"phone:{telefone_teste}"})
    
    await db_session.commit()

    # 2. Executar a limpeza de dados chamando delete_contact_data para o webhook 1
    await delete_contact_data(db_session, webhook1_id, table_name, [telefone_teste], lead_ids=[lead_id])
    await db_session.commit()

    # 3. Validar que o lead foi deletado
    res_leads_count = await db_session.execute(text(f"SELECT COUNT(*) FROM {table_name} WHERE telefone = :tel"), {"tel": telefone_teste})
    assert res_leads_count.scalar() == 0

    # 4. Validar que TODOS os eventos de webhook para o telefone foram deletados (inclusive o de webhook 2 / outras plataformas!)
    res_events_count = await db_session.execute(text("SELECT COUNT(*) FROM webhook_events WHERE telefone = :tel"), {"tel": telefone_teste})
    assert res_events_count.scalar() == 0

    # 5. Validar que todos os itens de conhecimento estruturados (inclusive os sincronizados por webhook de memória com prefixo 'phone:') foram removidos!
    res_items_count = await db_session.execute(text("SELECT COUNT(*) FROM knowledge_items WHERE metadata_val IN (:tel, :prefix_tel)"), {"tel": telefone_teste, "prefix_tel": f"phone:{telefone_teste}"})
    assert res_items_count.scalar() == 0

    # 6. Cleanup
    await db_session.execute(text("DELETE FROM webhook_configs WHERE id IN (:wid1, :wid2)"), {"wid1": webhook1_id, "wid2": webhook2_id})
    await db_session.commit()
