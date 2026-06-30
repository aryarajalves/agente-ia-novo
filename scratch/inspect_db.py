import sqlite3

def inspect():
    conn = sqlite3.connect("backend/database.db")
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print("Tables in database.db:")
    for table in tables:
        t_name = table[0]
        print(f"\nTable: {t_name}")
        cursor.execute(f"PRAGMA table_info({t_name});")
        columns = cursor.fetchall()
        for col in columns:
            print(f"  - {col[1]} ({col[2]})")
            
if __name__ == "__main__":
    inspect()
