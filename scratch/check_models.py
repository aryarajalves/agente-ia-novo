
import sqlite3
import os

db_path = r"c:\Users\aryar\.gemini\antigravity\scratch\Projetos Serios\Cria Agente de IA Para Automacao\backend\database.db"

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, name, model FROM agent_config WHERE name LIKE '%Bot Whats MLD%'")
        row = cursor.fetchone()
        if row:
            print(f"ID: {row[0]}, Name: {row[1]}, Model: {row[2]}")
        else:
            # If not found by name, just show the first one to be sure
            cursor.execute("SELECT id, name, model FROM agent_config LIMIT 1")
            row = cursor.fetchone()
            if row:
                print(f"ID: {row[0]}, Name: {row[1]}, Model: {row[2]}")
            else:
                print("No agents found in agent_config table.")
    except Exception as e:
        print(f"Error: {e}")
    conn.close()
else:
    print("Database not found at " + db_path)
