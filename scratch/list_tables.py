
import sqlite3
import os

def list_tables(db_path):
    if os.path.exists(db_path):
        print(f"--- Tables in {os.path.basename(db_path)} ---")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        for t in tables:
            print(t[0])
        conn.close()
    else:
        print(f"{db_path} not found")

list_tables(r"c:\Users\aryar\.gemini\antigravity\scratch\Projetos Serios\Cria Agente de IA Para Automacao\backend\database.db")
list_tables(r"c:\Users\aryar\.gemini\antigravity\scratch\Projetos Serios\Cria Agente de IA Para Automacao\backend\ai_agent.db")
