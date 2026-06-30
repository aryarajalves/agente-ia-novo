import sqlite3

conn = sqlite3.connect('database.db')
cursor = conn.cursor()
cursor.execute("SELECT id, session_id, model_used, input_tokens, output_tokens, cached_tokens, cost_brl FROM interaction_logs ORDER BY id DESC LIMIT 5")
rows = cursor.fetchall()
for row in rows:
    print(f"ID: {row[0]}, Session: {row[1]}, Model: {row[2]}, In: {row[3]}, Out: {row[4]}, Cached: {row[5]}, Cost: R${row[6]:.4f}")
conn.close()
