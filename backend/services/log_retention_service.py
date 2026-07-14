"""
services/log_retention_service.py — Limpeza automática de logs antigos dos containers.

Controlado pela variável de ambiente LOG_RETENTION_DAYS:
    - LOG_RETENTION_DAYS=0 (ou não definida)  -> NUNCA apaga nada (padrão seguro).
    - LOG_RETENTION_DAYS=7                    -> mantém só os últimos 7 dias de log.

Como funciona:
Cada container Docker grava seu console (stdout/stderr) num arquivo JSON-lines em
/var/lib/docker/containers/<id>/<id>-json.log no HOST. Para conseguir reescrever
esse arquivo removendo só as linhas antigas, o container do worker precisa ter
    /var/lib/docker/containers:/var/lib/docker/containers
montado com leitura E escrita (ver docker-compose-local.yml / docker-compose-producao.yml).
Sem esse volume, a limpeza simplesmente loga um aviso e não faz nada (não quebra o worker).
"""
import os
import json
import logging
from datetime import datetime, timedelta, timezone

from services.log_containers import get_docker_client, resolve_target_containers

logger = logging.getLogger(__name__)


def _get_retention_days() -> int:
    raw = os.getenv("LOG_RETENTION_DAYS", "0").strip()
    try:
        return int(raw)
    except ValueError:
        logger.warning(f"[LogRetention] LOG_RETENTION_DAYS inválido ({raw!r}), tratando como 0 (nunca apagar).")
        return 0


def _clean_log_file(log_path: str, cutoff: datetime) -> dict:
    """
    Reescreve o arquivo JSON-lines do Docker mantendo só as linhas com
    timestamp >= cutoff. Retorna {kept, removed} ou levanta exceção em caso de erro.
    """
    if not os.path.exists(log_path):
        return {"kept": 0, "removed": 0, "skipped": True}

    tmp_path = f"{log_path}.tmp_cleanup"
    kept = 0
    removed = 0

    with open(log_path, "r", encoding="utf-8", errors="replace") as src, \
         open(tmp_path, "w", encoding="utf-8") as dst:
        for line in src:
            stripped = line.strip()
            if not stripped:
                continue
            try:
                entry = json.loads(stripped)
                ts_str = entry.get("time", "")
                entry_dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            except (ValueError, json.JSONDecodeError):
                # Linha em formato inesperado: mantém por segurança (não arrisca perder dado).
                dst.write(line)
                kept += 1
                continue

            if entry_dt >= cutoff:
                dst.write(line)
                kept += 1
            else:
                removed += 1

    # Substituição atômica — evita arquivo de log corrompido/parcial em caso de falha no meio.
    os.replace(tmp_path, log_path)
    return {"kept": kept, "removed": removed, "skipped": False}


def cleanup_old_container_logs() -> dict:
    """
    Ponto de entrada chamado pela tarefa agendada (Celery beat). Retorna um
    resumo do que foi feito, para fins de log/observabilidade.
    """
    retention_days = _get_retention_days()
    if retention_days <= 0:
        logger.info("[LogRetention] LOG_RETENTION_DAYS=0 (ou ausente) — limpeza de logs desativada, nada foi apagado.")
        return {"enabled": False, "retention_days": retention_days}

    # Verifica se o host expõe /var/lib/docker/containers com escrita antes de tentar qualquer coisa.
    docker_root = "/var/lib/docker/containers"
    if not os.path.isdir(docker_root):
        logger.warning(
            "[LogRetention] Pasta /var/lib/docker/containers não está montada neste container — "
            "não é possível apagar logs antigos. Verifique o volume no docker-compose."
        )
        return {"enabled": True, "retention_days": retention_days, "error": "docker_root_not_mounted"}

    try:
        client = get_docker_client()
    except Exception as e:
        logger.error(f"[LogRetention] Não foi possível conectar ao Docker: {e}")
        return {"enabled": True, "retention_days": retention_days, "error": str(e)}

    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    results = []

    try:
        target_containers = resolve_target_containers(client)
        for container in target_containers:
            try:
                log_path = container.attrs.get("LogPath")
                if not log_path:
                    container.reload()
                    log_path = container.attrs.get("LogPath")
                if not log_path or not os.path.exists(log_path):
                    results.append({"container": container.name, "status": "log_path_not_found"})
                    continue

                stats = _clean_log_file(log_path, cutoff)
                results.append({"container": container.name, "status": "ok", **stats})
                logger.info(
                    f"[LogRetention] {container.name}: mantidas {stats['kept']} linha(s), "
                    f"removidas {stats['removed']} linha(s) com mais de {retention_days} dia(s)."
                )
            except PermissionError as e:
                results.append({"container": container.name, "status": "permission_error", "error": str(e)})
                logger.error(
                    f"[LogRetention] Sem permissão de escrita no log de {container.name}: {e}. "
                    "Verifique se o volume /var/lib/docker/containers foi montado com escrita (sem ':ro')."
                )
            except Exception as e:
                results.append({"container": container.name, "status": "error", "error": str(e)})
                logger.error(f"[LogRetention] Erro ao limpar log de {container.name}: {e}")
    finally:
        try:
            client.close()
        except Exception:
            pass

    return {"enabled": True, "retention_days": retention_days, "results": results}
