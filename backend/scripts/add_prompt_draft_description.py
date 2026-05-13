import sqlite3
import os

def migrate():
    # Caminho para o banco de dados SQLite
    db_path = os.path.join(os.path.dirname(__file__), '..', 'database.db')
    
    if not os.path.exists(db_path):
        print(f"Banco de dados não encontrado em {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Adiciona a coluna description à tabela prompt_drafts
        cursor.execute("ALTER TABLE prompt_drafts ADD COLUMN description TEXT")
        print("Coluna 'description' adicionada com sucesso à tabela 'prompt_drafts'.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("A coluna 'description' já existe na tabela 'prompt_drafts'.")
        else:
            print(f"Erro ao adicionar coluna: {e}")
    except Exception as e:
        print(f"Ocorreu um erro inesperado: {e}")
    finally:
        conn.commit()
        conn.close()

if __name__ == "__main__":
    migrate()
