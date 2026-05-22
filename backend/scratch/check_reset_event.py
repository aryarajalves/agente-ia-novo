import os
import json
from sqlalchemy import text
from database import engine_sync

with engine_sync.connect() as conn:
    print("=== WEBHOOK CONFIGS ===")
    configs = conn.execute(text("SELECT id, name, delete_keywords, delete_message, delete_labels FROM webhook_configs")).fetchall()
    for c in configs:
        print(f"ID: {c[0]}, Name: {c[1]}, Keywords: {c[2]}, Msg: {c[3]}, Labels: {c[4]}")
        
    print("\n=== RECENT WEBHOOK EVENTS ===")
    events = conn.execute(text("SELECT id, webhook_config_id, conversa_id, conta_id, telefone, mensagem, status, processing_steps, agent_response FROM webhook_events ORDER BY id DESC LIMIT 5")).fetchall()
    for e in events:
        print(f"ID: {e[0]}, Config: {e[1]}, Conv: {e[2]}, Account: {e[3]}, Tel: {e[4]}, Msg: {e[5]}, Status: {e[6]}")
        print(f"Response: {e[8]}")
        print("Steps:")
        try:
            steps = json.loads(e[7]) if e[7] else []
            for s in steps:
                print(f"  - [{s.get('step')}]: {s.get('detail')}")
        except Exception as err:
            print(f"  Error parsing steps: {err} | Raw: {e[7]}")
        print("-" * 40)
