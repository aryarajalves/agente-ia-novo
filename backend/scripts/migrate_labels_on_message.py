
import sqlite3
import os

def migrate():
    db_path = 'backend/database.db'
    if not os.path.exists(db_path):
        print(f"Banco de dados não encontrado em {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Adicionar coluna labels_on_message se não existir
        cursor.execute("ALTER TABLE webhook_configs ADD COLUMN labels_on_message TEXT")
        print("Coluna 'labels_on_message' adicionada com sucesso.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
            print("Coluna 'labels_on_message' já existe.")
        else:
            print(f"Erro ao adicionar coluna: {e}")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
