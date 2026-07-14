"""
api/routers/logs.py — Visualizador de Logs (console de todos os containers).

Lê, em tempo real, a saída padrão (stdout/stderr) de todos os containers Docker
do host (backend, worker, beat, frontend, db, redis, minio, cloudflare-tunnel, etc.)
através do socket do Docker montado em /var/run/docker.sock, sem precisar alterar
o sistema de logging já existente na aplicação.

Requer que o container do backend tenha o volume
    /var/run/docker.sock:/var/run/docker.sock:ro
montado (ver docker-compose-local.yml / docker-compose-producao.yml).

Usamos o timestamp que o próprio Docker grava para cada linha (--timestamps),
que é confiável e independente do formato de log de cada módulo da aplicação.
Isso permite agrupar corretamente por dia (fuso de Brasília) e filtrar por
horário, mesmo com containers que não usam o logging padrão do Python
(ex: redis, minio, postgres, nginx do frontend).
"""
import os
import re
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from api.deps import verify_api_key
from api.routers.backups import check_super_admin
from core.timezone import get_brasilia_tz
from services.log_containers import (
    get_allowed_container_prefixes as _get_allowed_container_prefixes,
    is_project_container as _is_project_container,
    resolve_target_containers as _resolve_target_containers,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/logs", tags=["Logs"])

BR_TZ = get_brasilia_tz()
VALID_LEVELS = ["CRITICAL", "ERROR", "WARNING", "INFO", "DEBUG"]

# Docker prefixa cada linha (quando timestamps=True) com um RFC3339Nano, ex:
# "2026-07-01T16:18:30.123456789Z mensagem original..."
DOCKER_TS_RE = re.compile(r"^(?P<ts>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)\s?(?P<rest>.*)$")

LEVEL_WORD = r"CRITICAL|ERROR|WARNING|WARN|INFO|DEBUG"

# O projeto usa vários formatos de log diferentes dependendo do módulo/processo,
# então tentamos casar, em ordem, com cada um deles:
CONTENT_LINE_PATTERNS = [
    # 1) "services.scheduler - INFO - mensagem..." (logging.Formatter com ' - ')
    re.compile(rf"^(?P<name>[\w\.\-\/]+)\s*-\s*(?P<level>{LEVEL_WORD})\s*-\s*(?P<msg>.*)$"),
    # 2) "INFO:services.backup_service:mensagem..." (formato padrão do logging.basicConfig)
    re.compile(rf"^(?P<level>{LEVEL_WORD}):(?P<name>[\w\.\-\/]+):(?P<msg>.*)$"),
    # 3) "[2026-07-02 12:40:40,625: INFO/ForkPoolWorker-1] mensagem..." (Celery)
    re.compile(rf"^\[[^\]]*?(?P<level>{LEVEL_WORD})/[^\]]*\]\s*(?P<msg>.*)$"),
    # 4) "ERROR S3: mensagem..." / "DEBUG S3: mensagem..." (print() usado em vez de logger)
    re.compile(rf"^(?P<level>{LEVEL_WORD})[\s:]+(?P<msg>.*)$"),
]

# Rede de segurança: mesmo quando nenhum formato estrutural é reconhecido (ex: prints
# sem prefixo de nível), promovemos o nível com base em palavras/emojis fortes no texto.
ERROR_HINTS = ["erro ao", "error", "exception", "traceback", "falha ao", "failed", "❌", "🔴"]
WARNING_HINTS = ["aviso", "warning", "atenção", "⚠️"]

# Mapeamento de "filtros rápidos" -> palavras-chave buscadas no nome do logger/mensagem.
QUICK_FILTERS = {
    "disparo_massa": ["bulk", "disparo"],
    "follow_up": ["follow", "funnel_trigger"],
    "funis": ["funnel"],
    "webhooks": ["webhook"],
    "agendamentos": ["schedule", "agendamento", "scheduler"],
    "ia": ["agent_core", "openai", "anthropic", "gemini", "assemblyai"],
    "banco_postgresql": ["database", "sqlalchemy", "postgres", "asyncpg", "alembic"],
    "backup": ["backup"],
    "uploads": ["media", "upload", "s3_service", "s3."],
    "importacao": ["import", "knowledge"],
}

QUICK_FILTER_LABELS = {
    "disparo_massa": "Disparo em Massa",
    "follow_up": "Follow-up",
    "funis": "Funis",
    "webhooks": "Webhooks / Atendimento",
    "agendamentos": "Agendamentos",
    "ia": "IA",
    "banco_postgresql": "Banco / PostgreSQL",
    "backup": "Backup",
    "uploads": "Uploads",
    "importacao": "Importação",
}


def _get_docker_client():
    try:
        import docker
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="Dependência 'docker' não instalada no backend. Rode 'pip install docker' e reinicie."
        )
    try:
        client = docker.from_env(timeout=3)
        client.ping()
        return client
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=(
                "Não foi possível conectar ao Docker via /var/run/docker.sock. "
                "Verifique se o socket foi montado no container do backend. "
                f"Detalhe: {e}"
            )
        )


def _classify_tags(name: str, message: str) -> List[str]:
    haystack = f"{name} {message}".lower()
    return [tag for tag, keywords in QUICK_FILTERS.items() if any(kw in haystack for kw in keywords)]


def _split_docker_line(raw_line: str):
    """Separa o timestamp injetado pelo Docker do conteúdo original da linha."""
    line = raw_line.rstrip("\n")
    match = DOCKER_TS_RE.match(line)
    if not match:
        return None, line
    ts_str = match.group("ts").replace("Z", "+00:00")
    try:
        dt_utc = datetime.fromisoformat(ts_str)
        if dt_utc.tzinfo is None:
            dt_utc = dt_utc.replace(tzinfo=timezone.utc)
        dt_br = dt_utc.astimezone(BR_TZ)
    except ValueError:
        dt_br = None
    return dt_br, match.group("rest")


def _detect_level_and_content(content: str, container_name: str):
    """Tenta os formatos de log conhecidos, em ordem, e cai num fallback por palavra-chave."""
    stripped = content.strip()
    for pattern in CONTENT_LINE_PATTERNS:
        match = pattern.match(stripped)
        if match:
            level = match.group("level").upper()
            if level == "WARN":
                level = "WARNING"
            name = match.groupdict().get("name") or container_name
            message = match.group("msg")
            return level, name, message

    # Nenhum formato estrutural reconhecido (ex: print() sem prefixo de nível/nível).
    return "INFO", container_name, content


def _apply_level_hint(level: str, message: str) -> str:
    """Rede de segurança: promove o nível com base em palavras/emojis fortes na mensagem,
    útil para linhas que não seguem nenhum formato estrutural de log (prints soltos)."""
    haystack = message.lower()
    if level not in ("CRITICAL", "ERROR") and any(hint in haystack for hint in ERROR_HINTS):
        return "ERROR"
    if level not in ("CRITICAL", "ERROR", "WARNING") and any(hint in haystack for hint in WARNING_HINTS):
        return "WARNING"
    return level


def _parse_line(raw_line: str, container_name: str, fallback_index: int) -> dict:
    dt_br, content = _split_docker_line(raw_line)
    level, name, message = _detect_level_and_content(content, container_name)
    level = _apply_level_hint(level, message)

    return {
        "id": f"{container_name}-{fallback_index}",
        "container": container_name,
        "timestamp_iso": dt_br.isoformat() if dt_br else None,
        "timestamp_display": dt_br.strftime("%d/%m/%Y %H:%M:%S") if dt_br else "--",
        "date": dt_br.strftime("%Y-%m-%d") if dt_br else None,
        "logger": name,
        "level": level,
        "message": message,
        "raw": content,
        "tags": _classify_tags(name, message),
    }


@router.get("/containers")
async def list_containers(
    db: AsyncSession = Depends(get_db),
    _ = Depends(check_super_admin),
    __ = Depends(verify_api_key),
):
    """Lista os containers principais deste projeto (backend, worker e frontend), ignorando outros stacks do mesmo host Docker."""
    client = _get_docker_client()
    try:
        allowed_prefixes = _get_allowed_container_prefixes()
        raw_containers = await asyncio.to_thread(client.containers.list, all=True)
        containers = [
            c for c in raw_containers
            if _is_project_container(c.name, allowed_prefixes)
        ]
        return [
            {
                "name": c.name,
                "id": c.short_id,
                "status": c.status,
                "image": (c.image.tags[0] if c.image and c.image.tags else "desconhecida"),
            }
            for c in containers
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar containers: {e}")
    finally:
        try:
            client.close()
        except Exception:
            pass


@router.get("/days")
async def list_available_days(
    containers: Optional[str] = Query(None, description="Nomes de containers separados por vírgula. Vazio = todos."),
    days_back: int = Query(30, ge=1, le=180, description="Quantos dias para trás verificar."),
    db: AsyncSession = Depends(get_db),
    _ = Depends(check_super_admin),
    __ = Depends(verify_api_key),
):
    """
    Varre os logs de todos os containers dentro da janela de 'days_back' dias e
    retorna quais dias (fuso de Brasília) realmente possuem linhas de log,
    junto com a contagem total — usado para popular o seletor de datas da UI.
    """
    client = _get_docker_client()
    try:
        target_containers = await asyncio.to_thread(_resolve_target_containers, client, containers)
        # Passamos timestamp Unix (int) em vez de um datetime para o docker-py — algumas
        # versões da lib quebram (TypeError: naive vs aware) ao tentar converter um
        # datetime com timezone internamente. Timestamp Unix evita essa ambiguidade.
        since_ts = int((datetime.now(timezone.utc) - timedelta(days=days_back)).timestamp())

        counts_by_day = {}
        errors = []
        total_count = 0

        for c in target_containers:
            try:
                raw = await asyncio.to_thread(c.logs, since=since_ts, stdout=True, stderr=True, timestamps=True)
                text = raw.decode("utf-8", errors="replace")
                for line in text.split("\n"):
                    if not line.strip():
                        continue
                    dt_br, _rest = _split_docker_line(line)
                    if not dt_br:
                        continue
                    day_key = dt_br.strftime("%Y-%m-%d")
                    counts_by_day[day_key] = counts_by_day.get(day_key, 0) + 1
                    total_count += 1
            except Exception as e:
                errors.append({"container": c.name, "error": str(e)})

        days = [
            {
                "date": day_key,
                "date_display": datetime.strptime(day_key, "%Y-%m-%d").strftime("%d/%m/%Y"),
                "count": count,
            }
            for day_key, count in sorted(counts_by_day.items(), reverse=True)
        ]

        return {
            "days": days,
            "total_count": total_count,
            "errors": errors,
        }
    finally:
        try:
            client.close()
        except Exception:
            pass


@router.get("")
@router.get("/")
async def get_logs(
    containers: Optional[str] = Query(None, description="Nomes de containers separados por vírgula. Vazio = todos."),
    tail: int = Query(2000, ge=1, le=5000, description="Quantidade de linhas mais recentes por container (usado quando 'day' não é informado)."),
    day: Optional[str] = Query(None, description="Filtra um dia específico no formato YYYY-MM-DD (fuso de Brasília)."),
    level: Optional[str] = Query(None, description="Níveis separados por vírgula: CRITICAL,ERROR,WARNING,INFO,DEBUG"),
    tag: Optional[str] = Query(None, description="Filtros rápidos separados por vírgula."),
    search: Optional[str] = Query(None, description="Busca no texto da mensagem."),
    time_from: Optional[str] = Query(None, description="Horário inicial HH:MM:SS (usado junto com 'day')."),
    time_to: Optional[str] = Query(None, description="Horário final HH:MM:SS (usado junto com 'day')."),
    db: AsyncSession = Depends(get_db),
    _ = Depends(check_super_admin),
    __ = Depends(verify_api_key),
):
    """
    Retorna os logs (stdout/stderr) de todos os containers do projeto, mesclados
    e filtrados por dia, horário, nível, filtro rápido (tag) e busca em texto.
    """
    client = _get_docker_client()
    try:
        target_containers = await asyncio.to_thread(_resolve_target_containers, client, containers)

        docker_kwargs = {"stdout": True, "stderr": True, "timestamps": True}
        if day:
            # Aceita "HH:MM" ou "HH:MM:SS" vindos do input de horário do navegador.
            time_from_norm = (time_from or "00:00:00").strip()
            if time_from_norm.count(":") == 1:
                time_from_norm += ":00"
            time_to_norm = (time_to or "23:59:59").strip()
            if time_to_norm.count(":") == 1:
                time_to_norm += ":59"

            try:
                since_naive = datetime.strptime(f"{day} {time_from_norm}", "%Y-%m-%d %H:%M:%S")
                until_naive = datetime.strptime(f"{day} {time_to_norm}", "%Y-%m-%d %H:%M:%S")
            except ValueError:
                raise HTTPException(status_code=400, detail="Formato de data/horário inválido. Use YYYY-MM-DD e HH:MM:SS.")

            # Timestamp Unix (int) em vez de datetime — o docker-py pode falhar ao
            # converter datetimes com timezone (naive vs aware) dependendo da versão.
            since_ts = int(since_naive.replace(tzinfo=BR_TZ).astimezone(timezone.utc).timestamp())
            until_ts = int(until_naive.replace(tzinfo=BR_TZ).astimezone(timezone.utc).timestamp())
            docker_kwargs["since"] = since_ts
            docker_kwargs["until"] = until_ts
            docker_kwargs["tail"] = "all"
        else:
            docker_kwargs["tail"] = tail

        entries = []
        errors = []
        for c in target_containers:
            try:
                raw = await asyncio.to_thread(c.logs, **docker_kwargs)
                text = raw.decode("utf-8", errors="replace")
                lines = [l for l in text.split("\n") if l.strip()]
                for idx, line in enumerate(lines):
                    entries.append(_parse_line(line, c.name, idx))
            except Exception as e:
                errors.append({"container": c.name, "error": str(e)})

        # Filtros adicionais em memória
        wanted_levels = {lv.strip().upper() for lv in level.split(",") if lv.strip()} if level else None
        wanted_tags = {t.strip() for t in tag.split(",") if t.strip()} if tag else None
        search_term = search.strip().lower() if search else None

        def keep(entry: dict) -> bool:
            if wanted_levels and entry["level"] not in wanted_levels:
                return False
            if wanted_tags and not (set(entry["tags"]) & wanted_tags):
                return False
            if search_term and search_term not in entry["message"].lower() and search_term not in entry["logger"].lower():
                return False
            return True

        filtered = [e for e in entries if keep(e)]
        filtered.sort(key=lambda e: e["timestamp_iso"] or "")

        level_counts = {lv: 0 for lv in VALID_LEVELS}
        for e in filtered:
            if e["level"] in level_counts:
                level_counts[e["level"]] += 1

        return {
            "total_raw": len(entries),
            "total_filtered": len(filtered),
            "level_counts": level_counts,
            "quick_filters": [{"key": k, "label": v} for k, v in QUICK_FILTER_LABELS.items()],
            "containers_queried": [c.name for c in target_containers],
            "errors": errors,
            "logs": filtered,
        }
    finally:
        try:
            client.close()
        except Exception:
            pass
