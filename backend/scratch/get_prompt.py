import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv('../../.env')

user = os.getenv('POSTGRES_USER')
pw = os.getenv('POSTGRES_PASSWORD')
db_name = os.getenv('POSTGRES_DB')
host = 'localhost'
port = '5433'

engine = create_engine(f'postgresql://{user}:{pw}@{host}:{port}/{db_name}')

with engine.connect() as conn:
    res = conn.execute(text("SELECT system_prompt FROM agent_config WHERE id = 1"))
    prompt = res.scalar()
    with open('agent_prompt.txt', 'w', encoding='utf-8') as f:
        f.write(prompt)
