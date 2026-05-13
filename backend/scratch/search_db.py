import os
import json
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv('../../.env')

user = 'postgres'
pw = 'postgres'
db_name = 'ai_agent_db'
host = 'localhost'
port = '5433'

engine = create_engine(f'postgresql://{user}:{pw}@{host}:{port}/{db_name}')

search_str = "Já já alguém da equipe"

with engine.connect() as conn:
    # Get all tables
    res = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
    tables = [row[0] for row in res]
    
    for table in tables:
        # Get all string columns
        res_cols = conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}' AND data_type IN ('character varying', 'text')"))
        columns = [row[0] for row in res_cols]
        
        for col in columns:
            try:
                # Search in column
                res_search = conn.execute(text(f"SELECT id FROM {table} WHERE {col} LIKE '%{search_str}%'"))
                rows = res_search.fetchall()
                if rows:
                    print(f"FOUND in table '{table}', column '{col}', IDs: {[r[0] for r in rows]}")
                    # Print the content
                    res_val = conn.execute(text(f"SELECT {col} FROM {table} WHERE id = :id"), {"id": rows[0][0]})
                    print(f"Content: {res_val.scalar()}")
            except Exception as e:
                # Some tables might not have 'id'
                pass
