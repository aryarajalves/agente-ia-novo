import logging
from sqlalchemy import text
from database.connection import engine_sync

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    # Colunas a adicionar
    migrations = [
        ("webhook_configs", "zapvoice_url", "TEXT"),
        ("webhook_configs", "zapvoice_api_token", "TEXT"),
        ("webhook_configs", "zapvoice_client_id", "TEXT"),
    ]

    with engine_sync.connect() as conn:
        # 1. Adicionar novas colunas se não existirem
        for table, column, col_type in migrations:
            logger.info(f"Verificando coluna {column} na tabela {table}...")
            try:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))
                conn.commit()
                logger.info(f"✅ Coluna {column} adicionada à tabela {table}.")
            except Exception as e:
                if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                    logger.info(f"✨ Coluna {column} já existe na tabela {table}.")
                else:
                    logger.error(f"❌ Erro ao adicionar coluna {column}: {e}")

        # 2. Migrar dados existentes do Chatwoot para o ZapVoice (se aplicável)
        try:
            logger.info("Migrando dados existentes do Chatwoot para as novas colunas do ZapVoice...")
            # Verifica se as colunas antigas existem
            res = conn.execute(text("SELECT chatwoot_url, chatwoot_api_token, chatwoot_inbox_id FROM webhook_configs LIMIT 1"))
            # Se a query rodar com sucesso, copia os valores
            conn.execute(text("""
                UPDATE webhook_configs 
                SET zapvoice_url = chatwoot_url,
                    zapvoice_api_token = chatwoot_api_token,
                    zapvoice_client_id = chatwoot_inbox_id
                WHERE zapvoice_url IS NULL
            """))
            conn.commit()
            logger.info("✅ Dados de Chatwoot migrados com sucesso para ZapVoice.")
        except Exception as e:
            logger.info(f"ℹ️ Não foi possível copiar dados antigos ou colunas antigas não existem: {e}")

if __name__ == "__main__":
    migrate()
