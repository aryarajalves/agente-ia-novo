import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))

user = os.getenv("POSTGRES_USER", "postgres")
pw = os.getenv("POSTGRES_PASSWORD", "postgres")
db_name = os.getenv("POSTGRES_DB", "ai_agent_db")
port = os.getenv("POSTGRES_PORT_EXTERNAL", "5433")

DATABASE_URL = f"postgresql://{user}:{pw}@localhost:{port}/{db_name}"
print(f"Connecting to: postgresql://{user}:***@localhost:{port}/{db_name}")
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    # Check support requests
    result = conn.execute(text("SELECT id, agent_id, session_id, account_id, conversation_id, status FROM support_requests ORDER BY id DESC LIMIT 5"))
    print("--- Support Requests ---")
    for row in result:
        print(row)
    
    # Check the tool transferir_robo
    result = conn.execute(text("SELECT id, name, labels_to_add, labels_to_remove, webhook_url, confirmation_message FROM tools"))
    print("\n--- All Tools Configuration ---")
    for row in result:
        print(row)
    
    # Check WebhookConfig
    result = conn.execute(text("SELECT id, agent_id, chatwoot_url, chatwoot_api_token, handoff_message FROM webhook_configs"))
    print("\n--- Webhook Configs ---")
    for row in result:
        print(row)
