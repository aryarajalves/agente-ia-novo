import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv('../.env')
url = os.getenv('DATABASE_URL')
if url:
    url = url.replace('+asyncpg', '')
    engine = create_engine(url)
    with engine.connect() as conn:
        res = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
        print("\n".join(sorted([row[0] for row in res])))
else:
    print("DATABASE_URL not found")
