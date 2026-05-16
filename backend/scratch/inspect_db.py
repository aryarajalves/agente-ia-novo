
import sqlite3
import json

def inspect_db():
    conn = sqlite3.connect('c:/Users/aryar/.gemini/antigravity/scratch/Projetos Serios/Cria Agente de IA Para Automacao/backend/database.db')
    cursor = conn.cursor()
    
    print("--- AGENTS ---")
    cursor.execute("SELECT id, name, system_prompt, handoff_enabled FROM agent_config")
    agents = cursor.fetchall()
    for a in agents:
        print(f"ID: {a[0]}, Name: {a[1]}, Handoff: {a[3]}")
        # print(f"Prompt: {a[2][:200]}...")
        
    print("\n--- TOOLS ---")
    cursor.execute("SELECT id, name, description FROM tools")
    tools = cursor.fetchall()
    for t in tools:
        print(f"ID: {t[0]}, Name: {t[1]}, Description: {t[2]}")
        
    print("\n--- AGENT TOOLS ---")
    cursor.execute("SELECT agent_id, tool_id FROM agent_tools")
    at = cursor.fetchall()
    for a_id, t_id in at:
        print(f"Agent {a_id} has tool {t_id}")

    conn.close()

if __name__ == "__main__":
    inspect_db()
