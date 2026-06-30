import sqlite3
import os
import sys
from sqlalchemy import create_engine, text

# Adiciona o diretório backend ao path para conseguir importar os módulos
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database.connection import SYNC_DATABASE_URL

def migrate():
    sqlite_db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'database.db'))
    if not os.path.exists(sqlite_db_path):
        print(f"❌ SQLite database not found at {sqlite_db_path}")
        return

    print(f"🔌 Connecting to SQLite: {sqlite_db_path}")
    sqlite_conn = sqlite3.connect(sqlite_db_path)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cursor = sqlite_conn.cursor()

    print(f"🔌 Connecting to PostgreSQL...")
    postgres_engine = create_engine(SYNC_DATABASE_URL)

    tables_to_migrate = [
        ("users", "users_id_seq"),
        ("tools", "tools_id_seq"),
        ("agent_config", "agent_config_id_seq"),
        ("interaction_logs", "interaction_logs_id_seq")
    ]

    with postgres_engine.begin() as pg_conn:
        # Desabilitar restrições temporariamente para evitar problemas de FK na migração
        pg_conn.execute(text("SET CONSTRAINTS ALL DEFERRED;"))

        for table_name, seq_name in tables_to_migrate:
            print(f"📦 Migrating table: {table_name}")
            
            # Pegar colunas da tabela no Postgres
            columns_res = pg_conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table_name}';"))
            pg_columns = {row[0] for row in columns_res.fetchall()}

            # Pegar quais colunas são do tipo boolean no Postgres
            bool_columns_res = pg_conn.execute(text(
                f"SELECT column_name FROM information_schema.columns "
                f"WHERE table_name='{table_name}' AND data_type='boolean';"
            ))
            bool_columns = {row[0] for row in bool_columns_res.fetchall()}
            if bool_columns:
                print(f"   found boolean columns: {bool_columns}")

            # Pegar registros do SQLite
            try:
                sqlite_cursor.execute(f"SELECT * FROM {table_name};")
                rows = sqlite_cursor.fetchall()
            except sqlite3.OperationalError as e:
                print(f"⚠️ Table {table_name} not found in SQLite: {e}")
                continue

            if not rows:
                print(f"ℹ️ Table {table_name} is empty in SQLite, skipping.")
                continue

            # Limpar dados antigos no Postgres
            pg_conn.execute(text(f"TRUNCATE TABLE {table_name} RESTART IDENTITY CASCADE;"))

            # Preparar o INSERT
            sample_row = rows[0]
            common_columns = [col for col in sample_row.keys() if col in pg_columns]
            
            columns_str = ", ".join(common_columns)
            placeholders_str = ", ".join([f":{col}" for col in common_columns])
            insert_query = text(f"INSERT INTO {table_name} ({columns_str}) VALUES ({placeholders_str});")

            # Inserir cada linha
            inserted_count = 0
            for row in rows:
                row_dict = dict(row)
                # Filtrar apenas as colunas que existem no Postgres
                filtered_row = {k: v for k, v in row_dict.items() if k in pg_columns}
                
                # Tratar colunas booleanas
                for col in bool_columns:
                    if col in filtered_row and filtered_row[col] is not None:
                        filtered_row[col] = bool(filtered_row[col])

                pg_conn.execute(insert_query, filtered_row)
                inserted_count += 1

            print(f"✅ Inserted {inserted_count} rows into {table_name}.")

            # Atualizar a sequence no PostgreSQL
            if seq_name:
                try:
                    pg_conn.execute(text(f"SELECT setval('{seq_name}', COALESCE((SELECT max(id) FROM {table_name}), 0) + 1, false);"))
                    print(f"🔄 Sequence {seq_name} updated successfully.")
                except Exception as e:
                    print(f"⚠️ Error updating sequence {seq_name}: {e}")

    sqlite_conn.close()
    print("🎉 Migration completed successfully!")

if __name__ == "__main__":
    migrate()
