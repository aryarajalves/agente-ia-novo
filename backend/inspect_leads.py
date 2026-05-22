import json
from database.connection import SessionLocal
from sqlalchemy import text

def inspect():
    db = SessionLocal()
    try:
        print("=== WEBHOOK CONFIGS ===")
        configs = db.execute(text("SELECT id, name, leads_table, chatwoot_url, chatwoot_api_token, window_close_label FROM webhook_configs")).fetchall()
        for cfg in configs:
            print(f"ID: {cfg[0]} | Name: {cfg[1]} | Table: {cfg[2]}")
            print(f"  Chatwoot URL: {cfg[3]}")
            print(f"  Chatwoot Token: {'***' if cfg[4] else 'None'}")
            print(f"  Window Close Label: {cfg[5]}")
            
            leads_table = cfg[2]
            if leads_table:
                print(f"  --- LEADS IN {leads_table} ---")
                try:
                    # Seleciona leads recentes ou com telefone correspondente
                    leads = db.execute(text(f"""
                        SELECT id, contato_nome, telefone, ultima_mensagem_em, window_close_processed, conversa_id, conta_id, labels
                        FROM {leads_table}
                        LIMIT 10
                    """)).fetchall()
                    for lead in leads:
                        print(f"    ID: {lead[0]} | Nome: {lead[1]} | Tel: {lead[2]}")
                        print(f"      Ultima Msg: {lead[3]} | Processado: {lead[4]}")
                        print(f"      Conversa ID: {lead[5]} | Conta ID: {lead[6]} | Labels: {lead[7]}")
                except Exception as e:
                    print(f"    Erro ao ler leads da tabela {leads_table}: {e}")
    finally:
        db.close()

if __name__ == '__main__':
    inspect()
