import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

if sys.platform.startswith("win"):
    sys.stdout.reconfigure(encoding="utf-8")

load_dotenv(dotenv_path="../.env")

DATABASE_URL = "postgresql://postgres:postgres@localhost:5433/ai_agent_db"
engine = create_engine(DATABASE_URL)

def get_agent_prompt():
    with engine.connect() as conn:
        res = conn.execute(text("SELECT id, name, system_prompt, qualification_questions FROM agent_configs WHERE id = 36"))
        row = res.fetchone()
        if row:
            print(f"ID: {row[0]} | Nome: {row[1]}")
            print("--- PERGUNTAS DE QUALIFICAÇÃO ---")
            print(row[3])
            print("--- PROMPT DE SISTEMA ---")
            print(row[2])
        else:
            print("Agente 36 não encontrado.")

if __name__ == "__main__":
    get_agent_prompt()
