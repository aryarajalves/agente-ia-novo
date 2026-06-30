import os
import uuid
import shutil
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from datetime import datetime, timezone

from database import get_db
from api.deps import get_current_user, verify_api_key
from models import UserModel, BackupConfigModel, BackupHistoryModel
from services.backup_service import BackupService
from s3_service import s3_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/backups", tags=["Backups"])

async def check_super_admin(current_email: str = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Verifica se o usuário atual possui a permissão de Super Admin."""
    from dotenv import dotenv_values
    env_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
    env_vars = dotenv_values(env_path) if os.path.exists(env_path) else {}
    admin_email = env_vars.get("ADMIN_EMAIL") or os.getenv("ADMIN_EMAIL") or "admin@agente.com"

    if current_email == admin_email:
        return True

    result = await db.execute(select(UserModel).where(UserModel.email == current_email))
    user = result.scalar_one_or_none()
    if not user or user.role != "Super Admin":
        raise HTTPException(
            status_code=403,
            detail="Apenas o Super Admin possui permissão para acessar esta área de backups."
        )
    return True

async def get_or_create_config(db: AsyncSession) -> BackupConfigModel:
    """Helper assíncrono para obter ou criar a configuração de backup."""
    result = await db.execute(select(BackupConfigModel))
    config = result.scalar_one_or_none()
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
        await db.commit()
        await db.refresh(config)
    return config

@router.get("/config")
async def get_backup_config(db: AsyncSession = Depends(get_db), _ = Depends(check_super_admin), __ = Depends(verify_api_key)):
    """Obtém a configuração de backup."""
    config = await get_or_create_config(db)
    
    result = await db.execute(
        select(BackupHistoryModel)
        .where(BackupHistoryModel.status == "success")
        .order_by(desc(BackupHistoryModel.created_at))
    )
    last_success = result.scalars().first()
    
    return {
        "id": config.id,
        "enabled": config.enabled,
        "frequency_type": config.frequency_type,
        "interval_value": config.interval_value,
        "retention_count": config.retention_count,
        "backup_folder": config.backup_folder,
        "last_run": config.last_run,
        "next_run": config.next_run,
        "last_success_filename": last_success.filename if last_success else None,
        "last_success_created_at": last_success.created_at if last_success else None
    }

@router.put("/config")
async def update_backup_config(
    data: dict, 
    db: AsyncSession = Depends(get_db), 
    _ = Depends(check_super_admin), 
    __ = Depends(verify_api_key)
):
    """Atualiza as configurações de backup automático."""
    config = await get_or_create_config(db)
    
    config.enabled = data.get("enabled", config.enabled)
    config.frequency_type = data.get("frequency_type", config.frequency_type)
    config.interval_value = int(data.get("interval_value", config.interval_value))
    config.retention_count = int(data.get("retention_count", config.retention_count))
    config.backup_folder = data.get("backup_folder", config.backup_folder)
    
    if config.enabled:
        config.next_run = BackupService.calculate_next_run(config.frequency_type, config.interval_value)
    else:
        config.next_run = None
        
    await db.commit()
    await db.refresh(config)
    
    return {
        "id": config.id,
        "enabled": config.enabled,
        "frequency_type": config.frequency_type,
        "interval_value": config.interval_value,
        "retention_count": config.retention_count,
        "backup_folder": config.backup_folder,
        "last_run": config.last_run,
        "next_run": config.next_run
    }

@router.post("/run")
async def run_manual_backup(
    db: AsyncSession = Depends(get_db), 
    _ = Depends(check_super_admin), 
    __ = Depends(verify_api_key)
):
    """Dispara um backup manual de forma assíncrona (via Celery)."""
    try:
        from tasks import trigger_manual_backup
        trigger_manual_backup.delay()
        return {"status": "success", "message": "Processo de backup iniciado em segundo plano."}
    except Exception as e:
        logger.error(f"Erro ao agendar Celery task de backup: {e}")
        # Executar backup síncrono se Celery falhar
        from database import SessionLocal
        sync_db = SessionLocal()
        try:
            history = BackupService.run_backup(sync_db, is_automatic=False)
            return {"status": history.status, "message": "Backup manual executado de forma síncrona.", "filename": history.filename}
        finally:
            sync_db.close()

@router.get("/history")
async def get_backup_history(db: AsyncSession = Depends(get_db), _ = Depends(check_super_admin), __ = Depends(verify_api_key)):
    """Lista o histórico de backups no banco."""
    # Sincroniza síncronamente antes de carregar
    from database import SessionLocal
    sync_db = SessionLocal()
    try:
        BackupService.sync_database_with_s3(sync_db)
    except Exception as e:
        logger.error(f"Erro ao sincronizar backups com S3: {e}")
    finally:
        sync_db.close()

    result = await db.execute(
        select(BackupHistoryModel).order_by(
            desc(BackupHistoryModel.is_pinned),
            desc(BackupHistoryModel.created_at)
        )
    )
    history = result.scalars().all()
    
    return [
        {
            "id": item.id,
            "filename": item.filename,
            "s3_key": item.s3_key,
            "file_size_bytes": item.file_size_bytes,
            "status": item.status,
            "error_message": item.error_message,
            "is_pinned": item.is_pinned,
            "created_at": item.created_at
        } for item in history
    ]

@router.post("/upload")
async def upload_backup(
    file: UploadFile = File(...), 
    db: AsyncSession = Depends(get_db), 
    _ = Depends(check_super_admin), 
    __ = Depends(verify_api_key)
):
    """Permite o upload de um backup externo (.dump, .dump.gz, .sql ou sem extensão do tipo backup_) e envia ao S3."""
    if not (file.filename.endswith(".dump") or file.filename.endswith(".dump.gz") or file.filename.endswith(".sql") or file.filename.startswith("backup_")):
        raise HTTPException(status_code=400, detail="Formato de arquivo inválido. Apenas .dump, .dump.gz, .sql ou arquivos que iniciam com 'backup_' são suportados.")

    temp_dir = "/tmp" if os.name != "nt" else os.getenv("TEMP", ".")
    temp_path = os.path.join(temp_dir, f"upload_{uuid.uuid4()}_{file.filename}")
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        from database import SessionLocal
        sync_db = SessionLocal()
        try:
            history = BackupService.upload_external_backup(sync_db, temp_path, file.filename)
            return {
                "id": history.id,
                "filename": history.filename,
                "s3_key": history.s3_key,
                "file_size_bytes": history.file_size_bytes,
                "status": history.status,
                "is_pinned": history.is_pinned,
                "created_at": history.created_at
            }
        finally:
            sync_db.close()
            
    except Exception as e:
        logger.error(f"Erro ao processar upload externo: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno no processamento: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@router.post("/history/{history_id}/pin")
async def toggle_pin_backup(
    history_id: int, 
    db: AsyncSession = Depends(get_db), 
    _ = Depends(check_super_admin), 
    __ = Depends(verify_api_key)
):
    """Alterna o status de 'fixado' (is_pinned) de um backup."""
    db_backup = await db.get(BackupHistoryModel, history_id)
    if not db_backup:
        raise HTTPException(status_code=404, detail="Backup não encontrado.")
    
    if not db_backup.is_pinned:
        # Contar backups já fixados
        result = await db.execute(
            select(BackupHistoryModel).filter(BackupHistoryModel.is_pinned == True)
        )
        pinned_count = len(result.scalars().all())
        if pinned_count >= 3:
            raise HTTPException(
                status_code=400, 
                detail="Limite de 3 backups fixados atingido. Desfixe um backup antes de fixar outro."
            )
            
    db_backup.is_pinned = not db_backup.is_pinned
    await db.commit()
    await db.refresh(db_backup)
    
    return {"id": db_backup.id, "is_pinned": db_backup.is_pinned}

@router.delete("/history/{history_id}")
async def delete_backup(
    history_id: int, 
    db: AsyncSession = Depends(get_db), 
    _ = Depends(check_super_admin), 
    __ = Depends(verify_api_key)
):
    """Deleta o backup físico do S3 e remove do banco de dados (bloqueia se estiver fixado)."""
    db_backup = await db.get(BackupHistoryModel, history_id)
    if not db_backup:
        raise HTTPException(status_code=404, detail="Backup não encontrado.")
    
    if db_backup.is_pinned:
        raise HTTPException(
            status_code=400, 
            detail="Não é possível excluir um backup fixado. Desfixe-o antes de excluir."
        )
    
    try:
        s3_service.delete_file(db_backup.s3_key)
    except Exception as e:
        logger.warning(f"Erro ao deletar arquivo {db_backup.s3_key} do S3: {e}")
    
    await db.delete(db_backup)
    await db.commit()
    return {"success": True, "message": "Backup excluído permanentemente."}

@router.post("/delete-batch")
async def delete_backups_batch(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    _ = Depends(check_super_admin),
    __ = Depends(verify_api_key)
):
    """Deleta múltiplos backups físicos do S3 e os remove do banco de dados (bloqueia se algum estiver fixado)."""
    ids = payload.get("ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="Nenhum ID de backup fornecido.")
    
    # Buscar os backups do histórico correspondentes
    result = await db.execute(
        select(BackupHistoryModel).where(BackupHistoryModel.id.in_(ids))
    )
    backups = result.scalars().all()
    
    if not backups:
        raise HTTPException(status_code=404, detail="Nenhum backup correspondente encontrado.")
        
    # Verificar se algum backup está fixado
    pinned_backups = [b.filename for b in backups if b.is_pinned]
    if pinned_backups:
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível excluir backups fixados. Remova a fixação antes de excluir: {', '.join(pinned_backups)}"
        )
        
    deleted_count = 0
    for db_backup in backups:
        try:
            s3_service.delete_file(db_backup.s3_key)
        except Exception as e:
            logger.warning(f"Erro ao deletar arquivo {db_backup.s3_key} do S3: {e}")
        
        await db.delete(db_backup)
        deleted_count += 1
        
    await db.commit()
    return {"success": True, "message": f"{deleted_count} backups excluídos permanentemente."}


@router.get("/history/{history_id}/download")
async def get_download_url(
    history_id: int, 
    db: AsyncSession = Depends(get_db), 
    _ = Depends(check_super_admin), 
    __ = Depends(verify_api_key)
):
    """Gera uma URL temporária (válida por 1 hora) para baixar o backup."""
    db_backup = await db.get(BackupHistoryModel, history_id)
    if not db_backup:
        raise HTTPException(status_code=404, detail="Backup não encontrado.")
    
    url = s3_service.generate_presigned_url(db_backup.s3_key, expiration=3600)
    if not url:
        raise HTTPException(status_code=500, detail="Erro ao gerar link de download temporário.")
    
    return {"url": url}

@router.post("/history/{history_id}/restore")
async def restore_backup_db(
    history_id: int, 
    db: AsyncSession = Depends(get_db), 
    _ = Depends(check_super_admin), 
    __ = Depends(verify_api_key)
):
    """Restaura o banco de dados PostgreSQL a partir do backup."""
    from database import SessionLocal
    sync_db = SessionLocal()
    try:
        import asyncio
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(
            None,
            BackupService.restore_backup,
            sync_db,
            history_id
        )
        return {"status": "success", "message": "Banco de dados restaurado com sucesso."}
    except Exception as e:
        logger.error(f"Erro ao restaurar banco de dados: {e}")
        raise HTTPException(status_code=500, detail=f"Falha na restauração: {str(e)}")
    finally:
        sync_db.close()

