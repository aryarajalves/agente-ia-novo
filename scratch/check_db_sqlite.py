import sqlite3

def check_db(name):
    print(f"=== {name} ===")
    try:
        conn = sqlite3.connect(name)
        cursor = conn.cursor()
        
        # List tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [r[0] for r in cursor.fetchall()]
        print("Tables:", tables)
        
        if "agent_configs" in tables:
            cursor.execute("SELECT count(*) FROM agent_configs")
            print("  agent_configs count:", cursor.fetchone()[0])
            
        if "interaction_logs" in tables:
            cursor.execute("SELECT count(*) FROM interaction_logs")
            print("  interaction_logs count:", cursor.fetchone()[0])
            cursor.execute("SELECT cost_brl FROM interaction_logs LIMIT 5")
            print("  some costs:", cursor.fetchall())
            
        conn.close()
    except Exception as e:
        print("Error:", e)

check_db("database.db")
check_db("ai_agent.db")
check_db("db.sqlite3")
