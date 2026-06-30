import sqlite3
import json

db_path = "backend/database.db"

def inspect():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("=== WEBHOOK CONFIGS ===")
    try:
        cursor.execute("SELECT id, name, leads_table, chatwoot_url, window_close_label FROM webhook_configs")
        configs = cursor.fetchall()
        for cfg in configs:
            print(f"ID: {cfg[0]} | Name: {cfg[1]} | Table: {cfg[2]}")
            print(f"  Chatwoot URL: {cfg[3]}")
            print(f"  Window Close Label: {cfg[4]}")
            
            leads_table = cfg[2]
            if leads_table:
                print(f"  --- LEADS IN {leads_table} ---")
                try:
                    # Seleciona leads recentes ou correspondentes ao telefone de Jessica
                    cursor.execute(f"""
                        SELECT id, contato_nome, telefone, ultima_mensagem_em, window_close_processed, conversa_id, conta_id, labels
                        FROM {leads_table}
                    """)
                    leads = cursor.fetchall()
                    for lead in leads:
                        if "5585986207" in str(lead[2]) or lead[2] == "5585986207100":
                            print(f"    FOUND LEAD: ID: {lead[0]} | Nome: {lead[1]} | Tel: {lead[2]}")
                            print(f"      Ultima Msg: {lead[3]} | Window Close Processed: {lead[4]}")
                            print(f"      Conversa ID: {lead[5]} | Conta ID: {lead[6]} | Labels: {lead[7]}")
                except Exception as e:
                    print(f"    Erro ao ler leads da tabela {leads_table}: {e}")
    except Exception as e:
        print(f"Erro ao ler webhook_configs: {e}")
        
    conn.close()

if __name__ == '__main__':
    inspect()
