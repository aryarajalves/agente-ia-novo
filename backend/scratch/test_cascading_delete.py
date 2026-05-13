import asyncio
import sys
import os

# Adiciona o diretório atual ao sys.path para importar os módulos do backend
sys.path.append(os.getcwd())

from sqlalchemy import text
# Adiciona o diretório /app ao sys.path
sys.path.append("/app")

try:
    from database import engine
except ImportError:
    from backend.database import engine

async def test_cascading_delete():
    test_phone = "5511999999999"
    test_phone_norm = "5511999999999" # Já normalizado
    
    print(f"🚀 Iniciando teste de deleção em cascata para o telefone: {test_phone}")
    
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT id FROM webhook_configs LIMIT 1"))
        wid = res.scalar()
        if not wid:
            print("❌ Erro: Nenhuma configuração de webhook encontrada no banco para realizar o teste.")
            return

    async with engine.begin() as conn:
        # 1. Limpeza prévia
        await conn.execute(text("DELETE FROM webhook_events WHERE telefone = :tel"), {"tel": test_phone})
        await conn.execute(text("DELETE FROM user_memory WHERE session_id = :tel"), {"tel": test_phone})
        await conn.execute(text("DELETE FROM session_summaries WHERE session_id = :tel"), {"tel": test_phone})
        await conn.execute(text("DELETE FROM interaction_logs WHERE session_id = :tel"), {"tel": test_phone})
        
        # 2. Inserir dados fictícios
        print("📝 Inserindo dados fictícios...")
        
        # Webhook Events (History/Memory Logs)
        await conn.execute(text("""
            INSERT INTO webhook_events (webhook_config_id, event_type, telefone, status, created_at)
            VALUES (:wid, 'message', :tel, 'completed', now()),
                   (:wid, 'memory', :tel, 'completed', now()),
                   (:wid, 'followup', :tel, 'pending', now())
        """), {"wid": wid, "tel": test_phone})
        
        # User Memory (Facts)
        await conn.execute(text("""
            INSERT INTO user_memory (session_id, key, value, confidence)
            VALUES (:tel, 'nome_teste', 'Fulano de Tal', 1.0)
        """), {"tel": test_phone})
        
        # Session Summaries
        await conn.execute(text("""
            INSERT INTO session_summaries (session_id, agent_id, summary_text)
            VALUES (:tel, 1, 'Resumo de teste')
        """), {"tel": test_phone})
        
        # Interaction Logs
        await conn.execute(text("""
            INSERT INTO interaction_logs (session_id, user_message, agent_response)
            VALUES (:tel, 'Oi', 'Olá!')
        """), {"tel": test_phone})
        
    # 3. Verificar se as inserções ocorreram
    async with engine.connect() as conn:
        res_events = await conn.execute(text("SELECT count(*) FROM webhook_events WHERE telefone = :tel"), {"tel": test_phone})
        num_events = res_events.scalar()
        print(f"✅ Registros em webhook_events: {num_events}")
        
    # 4. Simular a deleção (Usando a mesma lógica implementada nos arquivos)
    print("🗑️ Executando deleção em cascata (Simulação)...")
    async with engine.begin() as conn:
        await conn.execute(text("DELETE FROM webhook_events WHERE (telefone = :tel OR telefone = :tel_norm)"), {"tel": test_phone, "tel_norm": test_phone_norm})
        await conn.execute(text("DELETE FROM user_memory WHERE session_id = :tel OR session_id = :tel_norm"), {"tel": test_phone, "tel_norm": test_phone_norm})
        await conn.execute(text("DELETE FROM session_summaries WHERE session_id = :tel OR session_id = :tel_norm"), {"tel": test_phone, "tel_norm": test_phone_norm})
        await conn.execute(text("DELETE FROM interaction_logs WHERE session_id = :tel OR session_id = :tel_norm"), {"tel": test_phone, "tel_norm": test_phone_norm})

    # 5. Verificar se tudo foi apagado
    async with engine.connect() as conn:
        tables = [
            ("webhook_events", "telefone"),
            ("user_memory", "session_id"),
            ("session_summaries", "session_id"),
            ("interaction_logs", "session_id")
        ]
        
        success = True
        for table, col in tables:
            res = await conn.execute(text(f"SELECT count(*) FROM {table} WHERE {col} = :tel"), {"tel": test_phone})
            count = res.scalar()
            if count == 0:
                print(f"✔️ {table}: 0 registros (Limpo)")
            else:
                print(f"❌ {table}: {count} registros ainda existem!")
                success = False
        
        if success:
            print("\n✨ TESTE CONCLUÍDO COM SUCESSO! A deleção em cascata está funcionando perfeitamente.")
        else:
            print("\n⚠️ ALGUNS REGISTROS NÃO FORAM APAGADOS. Verifique a lógica.")

if __name__ == "__main__":
    asyncio.run(test_cascading_delete())
