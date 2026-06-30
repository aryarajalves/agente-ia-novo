import sqlite3
import os

def check_db(name):
    if not os.path.exists(name):
        print(f"{name} does not exist")
        return
    print(f"\n=== INSPECTING {name} ===")
    conn = sqlite3.connect(name)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    for t in tables:
        t_name = t[0]
        cursor.execute(f"SELECT COUNT(*) FROM {t_name}")
        cnt = cursor.fetchone()[0]
        print(f"Table: {t_name} | Rows: {cnt}")
        cursor.execute(f"PRAGMA table_info({t_name});")
        cols = [c[1] for c in cursor.fetchall()]
        print(f"  Columns: {cols}")
    conn.close()

check_db("backend/db.sqlite3")
check_db("backend/ai_agent.db")
check_db("backend/database.db")
