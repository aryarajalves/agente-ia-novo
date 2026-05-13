import os
from dotenv import load_dotenv

# Carregar variáveis do .env (está na raiz) - DEVE SER ANTES DOS IMPORTS DO PROJETO
load_dotenv(".env")

# Se DATABASE_URL não estiver no .env, vamos construir a partir dos componentes
if not os.getenv("DATABASE_URL"):
    user = os.getenv("POSTGRES_USER", "postgres")
    pw = os.getenv("POSTGRES_PASSWORD", "postgres")
    db_name = os.getenv("POSTGRES_DB", "ai_agent_db")
    port = os.getenv("POSTGRES_PORT_EXTERNAL", "5433")
    # Formato asyncpg para o import inicial
    os.environ["DATABASE_URL"] = f"postgresql+asyncpg://{user}:{pw}@localhost:{port}/{db_name}"

from sqlalchemy import text
from database import SessionLocal
from models import WebhookConfigModel

def migrate():
    db = SessionLocal()
    try:
        # 1. Buscar todas as tabelas de leads configuradas nos webhooks
        configs = db.query(WebhookConfigModel).all()
        tables = set([c.leads_table for c in configs if c.leads_table])
        
        # Garantir que a tabela padrão também seja processada
        tables.add("leads_identificados")
        
        for table_name in tables:
            print(f"Checking table: {table_name}")
            try:
                # Adicionar coluna message_type
                db.execute(text(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS message_type VARCHAR(50) DEFAULT 'text'"))
                # Adicionar coluna link
                db.execute(text(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS link TEXT"))
                db.commit()
                print(f"OK: Table {table_name} updated successfully.")
            except Exception as e:
                db.rollback()
                print(f"ERROR: updating table {table_name}: {e}")
                
        print("\nMigration completed!")
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
