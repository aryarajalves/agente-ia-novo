import sqlite3
import os
from database import DATABASE_URL, engine_sync
from sqlalchemy import text

def add_indices():
    # Detecta se é SQLite ou PostgreSQL via DATABASE_URL
    is_sqlite = DATABASE_URL.startswith("sqlite")
    
    tables_to_index = ["leads"]
    
    # 1. Buscar tabelas de leads dinâmicas do webhook_configs
    try:
        if is_sqlite:
            db_path = DATABASE_URL.replace("sqlite:///", "")
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT DISTINCT leads_table FROM webhook_configs")
            rows = cursor.fetchall()
            for r in rows:
                if r[0] and r[0] not in tables_to_index:
                    tables_to_index.append(r[0])
            conn.close()
        else:
            with engine_sync.connect() as conn:
                res = conn.execute(text("SELECT DISTINCT leads_table FROM webhook_configs"))
                rows = res.fetchall()
                for r in rows:
                    if r[0] and r[0] not in tables_to_index:
                        tables_to_index.append(r[0])
    except Exception as e:
        print(f"⚠️ Não foi possível listar webhook_configs para extrair tabelas de leads: {e}")

    print(f"🔍 Tabelas de leads para indexar: {tables_to_index}")

    if is_sqlite:
        db_path = DATABASE_URL.replace("sqlite:///", "")
        print(f"🔧 Aplicando índices no SQLite: {db_path}")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        try:
            # Índice adicional no webhook_events
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_webhook_events_config_id ON webhook_events (webhook_config_id)")
            
            # Índices de performance no interaction_logs (Financeiro)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_interaction_logs_timestamp ON interaction_logs (timestamp)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_interaction_logs_agent_id ON interaction_logs (agent_id)")
            
            # Índices em todas as tabelas de leads
            for tbl in tables_to_index:
                try:
                    cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_{tbl}_webhook_config_id ON {tbl} (webhook_config_id)")
                    cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_{tbl}_telefone ON {tbl} (telefone)")
                    cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_{tbl}_ultima_msg ON {tbl} (ultima_mensagem_em)")
                except Exception as tbl_err:
                    print(f"⚠️ Erro ao criar índice na tabela {tbl}: {tbl_err}")
                    
            conn.commit()
            print("✅ Índices de performance criados com sucesso no SQLite.")
        except Exception as e:
            print(f"❌ Erro ao criar índices no SQLite: {e}")
        finally:
            conn.close()
    else:
        # Para PostgreSQL (via engine_sync)
        print("🔧 Detectado PostgreSQL. Aplicando índices via engine_sync...")
        with engine_sync.connect() as conn:
            try:
                # Índice adicional no webhook_events
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_webhook_events_config_id ON webhook_events (webhook_config_id)"))
                
                # Índices de performance no interaction_logs (Financeiro)
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_interaction_logs_timestamp ON interaction_logs (timestamp)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_interaction_logs_agent_id ON interaction_logs (agent_id)"))
                
                # Índices em todas as tabelas de leads
                for tbl in tables_to_index:
                    try:
                        conn.execute(text(f"CREATE INDEX IF NOT EXISTS idx_{tbl}_webhook_config_id ON {tbl} (webhook_config_id)"))
                        conn.execute(text(f"CREATE INDEX IF NOT EXISTS idx_{tbl}_telefone ON {tbl} (telefone)"))
                        conn.execute(text(f"CREATE INDEX IF NOT EXISTS idx_{tbl}_ultima_msg ON {tbl} (ultima_mensagem_em DESC NULLS LAST)"))
                    except Exception as tbl_err:
                        print(f"⚠️ Erro ao criar índice na tabela {tbl}: {tbl_err}")
                
                conn.commit()
                print("✅ Índices de performance criados com sucesso no PostgreSQL.")
            except Exception as e:
                print(f"❌ Erro ao criar índices no PostgreSQL: {e}")

if __name__ == "__main__":
    add_indices()
