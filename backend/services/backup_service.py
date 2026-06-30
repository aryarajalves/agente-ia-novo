import os
import sys
import subprocess
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from sqlalchemy import text, desc
from sqlalchemy.orm import Session
from database.connection import DATABASE_URL, SessionLocal
from models import BackupConfigModel, BackupHistoryModel
from s3_service import s3_service

logger = logging.getLogger(__name__)

class BackupService:
    @staticmethod
    def get_config(db: Session) -> BackupConfigModel:
        """Obtém a configuração única de backup ou cria se não existir."""
        config = db.query(BackupConfigModel).first()
        if not config:
            config = BackupConfigModel(
                enabled=False,
                frequency_type="hours",
                interval_value=6,
                retention_count=30,
                backup_folder="Backup_AgenteFlow",
                last_run=None,
                next_run=None
            )
            db.add(config)
            db.commit()
            db.refresh(config)
        return config

    @staticmethod
    def calculate_next_run(frequency_type: str, interval_value: int) -> datetime:
        """Calcula a data do próximo agendamento."""
        now = datetime.now(timezone.utc)
        if frequency_type == "hours":
            return now + timedelta(hours=interval_value)
        elif frequency_type == "days":
            return now + timedelta(days=interval_value)
        return now + timedelta(hours=6)

    @staticmethod
    def run_backup(db: Session, is_automatic: bool = False) -> BackupHistoryModel:
        """
        Executa o dump do Postgres, envia para o S3 Backblaze,
        atualiza o histórico e executa a política de limpeza (retenção).
        """
        logger.info("🎬 Iniciando processo de backup do banco de dados...")
        
        # 1. Obter informações de conexão da DATABASE_URL
        # Formato esperado: postgresql+asyncpg://user:password@host:port/dbname
        # pg_dump precisa do formato padrão: postgresql://user:password@host:port/dbname
        clean_url = DATABASE_URL.replace("+asyncpg", "").replace("+aiosqlite", "")
        
        # 2. Criar arquivo temporário para o dump
        from core.timezone import get_now_br
        timestamp = get_now_br().strftime("%Y_%m_%d_%H_%M_%S")
        filename = f"backup_{timestamp}"
        local_path = os.path.join("/tmp" if os.name != "nt" else os.getenv("TEMP", "."), filename)

        config = BackupService.get_config(db)
        folder = (config.backup_folder or "Backup_AgenteFlow").strip().strip("/")
        if not folder:
            folder = "Backup_AgenteFlow"

        history_entry = BackupHistoryModel(
            filename=filename,
            s3_key=f"{folder}/{filename}",
            status="running",
            created_at=datetime.now(timezone.utc)
        )
        db.add(history_entry)
        db.commit()
        db.refresh(history_entry)

        try:
            logger.info(f"💾 Executando pg_dump para {local_path}...")
            # Definir a variável PGPASSWORD se houver senha para evitar prompt interativo
            # Vamos executar com pg_dump
            # pg_dump -d "postgresql://user:pass@host:port/db" -F c -Z 9 -f local_path
            # -F c (formato custom) -Z 9 (compressão máxima)
            cmd = [
                "pg_dump",
                "-d", clean_url,
                "-F", "c",
                "-Z", "9",
                "-f", local_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            logger.info("✅ pg_dump concluído com sucesso.")

            # Obter tamanho do arquivo
            file_size = os.path.getsize(local_path)
            history_entry.file_size_bytes = file_size

            # 3. Upload para o S3
            logger.info(f"📤 Enviando {filename} para o S3 no bucket {s3_service.bucket_name}...")
            s3_service.s3_client.upload_file(
                local_path,
                s3_service.bucket_name,
                history_entry.s3_key
            )
            logger.info("✅ Envio para o S3 concluído.")

            # 4. Atualizar registro de histórico como Sucesso
            history_entry.status = "success"
            
            # Atualizar data do último backup na configuração
            config = BackupService.get_config(db)
            config.last_run = datetime.now(timezone.utc)
            if config.enabled:
                config.next_run = BackupService.calculate_next_run(config.frequency_type, config.interval_value)
            
            db.commit()

            # 5. Executar a política de retenção
            BackupService.apply_retention_policy(db, config.retention_count)

        except Exception as e:
            error_msg = str(e)
            logger.error(f"❌ Erro ao realizar backup: {error_msg}")
            history_entry.status = "failure"
            history_entry.error_message = error_msg
            db.commit()
        finally:
            # Limpeza do arquivo local temporário
            if os.path.exists(local_path):
                try:
                    os.remove(local_path)
                except Exception as cleanup_err:
                    logger.warning(f"⚠️ Não foi possível remover o arquivo local temporário: {cleanup_err}")

        return history_entry

    @staticmethod
    def apply_retention_policy(db: Session, retention_limit: int):
        """
        Remove os backups antigos que ultrapassarem o limite de retenção configurado,
        mantendo sempre os backups marcados como 'is_pinned = True'.
        """
        logger.info(f"🧹 Aplicando política de retenção (limite: {retention_limit})...")
        
        # Obter todos os backups de sucesso que não estão fixados (ordenados do mais novo para o mais antigo)
        active_backups = db.query(BackupHistoryModel)\
            .filter(BackupHistoryModel.status == "success")\
            .filter(BackupHistoryModel.is_pinned == False)\
            .order_by(desc(BackupHistoryModel.created_at))\
            .all()

        # Obter quantos backups com sucesso e fixados existem
        pinned_count = db.query(BackupHistoryModel)\
            .filter(BackupHistoryModel.status == "success")\
            .filter(BackupHistoryModel.is_pinned == True)\
            .count()

        allowed_unpinned = max(0, retention_limit - pinned_count)

        if len(active_backups) > allowed_unpinned:
            to_delete = active_backups[allowed_unpinned:]
            logger.info(f"🗑️ Encontrados {len(to_delete)} backups não fixados para remoção.")
            
            for backup in to_delete:
                try:
                    # Deletar do S3
                    logger.info(f"S3: Removendo chave {backup.s3_key}...")
                    s3_service.delete_file(backup.s3_key)
                    # Deletar do banco
                    db.delete(backup)
                except Exception as s3_err:
                    logger.error(f"❌ Falha ao excluir backup {backup.filename} do S3/Banco: {s3_err}")
            
            db.commit()
            logger.info("✅ Limpeza de backups antigos concluída.")
        else:
            logger.info("✨ Quantidade de backups dentro do limite de retenção.")

    @staticmethod
    def upload_external_backup(db: Session, file_path: str, filename: str) -> BackupHistoryModel:
        """
        Faz o upload de um backup externo para o S3 Backblaze e registra no histórico.
        """
        config = BackupService.get_config(db)
        folder = (config.backup_folder or "Backup_AgenteFlow").strip().strip("/")
        if not folder:
            folder = "Backup_AgenteFlow"
        s3_key = f"{folder}/{filename}"
        file_size = os.path.getsize(file_path)

        # Upload para o S3
        s3_service.s3_client.upload_file(file_path, s3_service.bucket_name, s3_key)

        # Backups externos vêm fixados por padrão se o limite de 3 não foi atingido
        pinned_count = db.query(BackupHistoryModel).filter(BackupHistoryModel.is_pinned == True).count()
        should_pin = pinned_count < 3

        history_entry = BackupHistoryModel(
            filename=filename,
            s3_key=s3_key,
            file_size_bytes=file_size,
            status="success",
            is_pinned=should_pin,
            created_at=datetime.now(timezone.utc)
        )
        db.add(history_entry)
        db.commit()
        db.refresh(history_entry)
        
        # Aplicar política de retenção após adicionar
        config = BackupService.get_config(db)
        BackupService.apply_retention_policy(db, config.retention_count)
        
        return history_entry

    @staticmethod
    def restore_backup(db: Session, history_id: int) -> bool:
        """
        Restaura o banco de dados PostgreSQL a partir de um backup existente no S3 do Backblaze.
        """
        backup = db.query(BackupHistoryModel).filter(BackupHistoryModel.id == history_id).first()
        if not backup:
            raise Exception("Backup não encontrado no histórico.")

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        temp_filename = f"restore_{timestamp}.dump"
        local_path = os.path.join("/tmp" if os.name != "nt" else os.getenv("TEMP", "."), temp_filename)

        try:
            logger.info(f"📥 Baixando backup {backup.filename} do S3...")
            s3_service.s3_client.download_file(s3_service.bucket_name, backup.s3_key, local_path)

            logger.info("🔌 Executando pg_restore...")
            clean_url = DATABASE_URL.replace("+asyncpg", "").replace("+aiosqlite", "")

            # pg_restore -d url -c --no-owner --no-privileges local_path
            # --clean (-c): drop database objects before recreating
            # --no-owner: skip restoration of object ownership
            # --no-privileges: skip restoration of access privileges
            cmd = [
                "pg_restore",
                "-d", clean_url,
                "--clean",
                "--no-owner",
                "--no-privileges",
                local_path
            ]

            # Terminamos conexões ativas para evitar lock do banco (opcional/segurança extra)
            try:
                db.execute(text(
                    "SELECT pg_terminate_backend(pg_stat_activity.pid) "
                    "FROM pg_stat_activity "
                    "WHERE pg_stat_activity.datname = current_database() "
                    "AND pid <> pg_backend_pid();"
                ))
                db.commit()
            except Exception as conn_err:
                logger.warning(f"⚠️ Não foi possível desconectar outros clientes ativos: {conn_err}")

            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            logger.info("✅ Restauração do banco concluída com sucesso.")
            return True
        finally:
            if os.path.exists(local_path):
                try:
                    os.remove(local_path)
                except Exception as cleanup_err:
                    logger.warning(f"⚠️ Erro ao remover arquivo temporário de restore: {cleanup_err}")

    @staticmethod
    def sync_database_with_s3(db: Session):
        """
        Sincroniza o banco de dados com os backups reais presentes no S3 do Backblaze.
        Isso garante que se o banco for restaurado para um estado anterior, backups criados posteriormente
        (mas que ainda existem no S3) reapareçam no histórico como sucesso.
        """
        try:
            logger.info("🔄 Sincronizando histórico do banco de dados com arquivos no S3...")
            response = s3_service.s3_client.list_objects_v2(
                Bucket=s3_service.bucket_name,
                Prefix="Backup_AgenteFlow/"
            )
            
            if "Contents" not in response:
                logger.info("ℹ️ Nenhum arquivo encontrado no prefixo do S3.")
                return

            # Mapear chaves existentes no banco
            db_backups = {r.s3_key: r for r in db.query(BackupHistoryModel).all()}
            s3_keys_in_bucket = set()

            added_count = 0
            updated_count = 0
            
            for obj in response["Contents"]:
                s3_key = obj["Key"]
                if s3_key == "Backup_AgenteFlow/":
                    continue
                
                s3_keys_in_bucket.add(s3_key)

                if s3_key not in db_backups:
                    filename = s3_key.split("/")[-1]
                    
                    created_at = None
                    if filename.startswith("backup_"):
                        clean_name = filename.replace("backup_", "")
                        for ext in [".dump.gz", ".dump", ".sql"]:
                            clean_name = clean_name.replace(ext, "")
                        
                        try:
                            created_at = datetime.strptime(clean_name, "%Y_%m_%d_%H_%M_%S").replace(tzinfo=timezone.utc)
                        except ValueError:
                            try:
                                created_at = datetime.strptime(clean_name, "%Y%m%d_%H%M%S").replace(tzinfo=timezone.utc)
                            except ValueError:
                                pass
                    
                    if not created_at:
                        created_at = obj["LastModified"]

                    history_entry = BackupHistoryModel(
                        filename=filename,
                        s3_key=s3_key,
                        file_size_bytes=obj["Size"],
                        status="success",
                        is_pinned=False,
                        created_at=created_at
                    )
                    db.add(history_entry)
                    added_count += 1
                else:
                    # Se já existe no banco mas está marcado como running, e existe no S3, atualiza para success
                    db_entry = db_backups[s3_key]
                    if db_entry.status == "running":
                        db_entry.status = "success"
                        db_entry.file_size_bytes = obj["Size"]
                        updated_count += 1

            # Tratar backups travados em 'running' que não estão no S3 (falha/crashed)
            for s3_key, db_entry in db_backups.items():
                if db_entry.status == "running" and s3_key not in s3_keys_in_bucket:
                    # Se foi criado há mais de 15 minutos, marca como falha
                    created_time = db_entry.created_at
                    if created_time.tzinfo is None:
                        created_time = created_time.replace(tzinfo=timezone.utc)
                    if datetime.now(timezone.utc) - created_time > timedelta(minutes=15):
                        db_entry.status = "failure"
                        db_entry.error_message = "Backup interrompido ou falhou ao processar."
                        updated_count += 1
            
            if added_count > 0 or updated_count > 0:
                db.commit()
                logger.info(f"✅ Sincronização S3 concluída. Inseridos: {added_count}, Atualizados: {updated_count}.")
            else:
                logger.info("✅ Sincronização S3 concluída. Todos os arquivos já constavam no banco.")
        except Exception as e:
            logger.error(f"❌ Erro ao sincronizar histórico com S3: {e}")


