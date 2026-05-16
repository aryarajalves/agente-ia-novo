import sqlite3
import os

db_path = 'backend/database.db'
if not os.path.exists(db_path):
    print(f"File {db_path} not found")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print(f"Tables: {tables}")

for table in tables:
    table_name = table[0]
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = cursor.fetchall()
    col_names = [c[1] for c in columns]
    if 'initial_message' in col_names:
        print(f"Found 'initial_message' in table: {table_name}")
        cursor.execute(f"SELECT id, name, initial_message FROM {table_name}")
        print(f"Rows: {cursor.fetchall()}")

conn.close()
