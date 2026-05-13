import sqlite3
import os
from database import DATABASE_URL, engine_sync
from sqlalchemy import text

def add_indices():
    # Detecta se é SQLite ou PostgreSQL via DATABASE_URL
    if DATABASE_URL.startswith("sqlite"):
        db_path = DATABASE_URL.replace("sqlite:///", "")
        print(f"🔧 Aplicando índices no SQLite: {db_path}")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_webhook_events_telefone ON webhook_events (telefone)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_webhook_events_conversa_id ON webhook_events (conversa_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_webhook_events_conta_id ON webhook_events (conta_id)")
            conn.commit()
            print("✅ Índices criados com sucesso no SQLite.")
        except Exception as e:
            print(f"❌ Erro ao criar índices no SQLite: {e}")
        finally:
            conn.close()
    else:
        # Para PostgreSQL (via engine_sync)
        print("🔧 Detectado PostgreSQL. Tentando aplicar via engine_sync...")
        with engine_sync.connect() as conn:
            try:
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_webhook_events_telefone ON webhook_events (telefone)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_webhook_events_conversa_id ON webhook_events (conversa_id)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_webhook_events_conta_id ON webhook_events (conta_id)"))
                conn.commit()
                print("✅ Índices criados com sucesso no PostgreSQL.")
            except Exception as e:
                print(f"❌ Erro ao criar índices no PostgreSQL: {e}")

if __name__ == "__main__":
    add_indices()
