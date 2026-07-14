"""
services/log_containers.py — Descoberta dos containers Docker deste projeto.

Compartilhado entre o Visualizador de Logs (api/routers/logs.py) e a limpeza
automática de logs antigos (services/log_retention_service.py), para garantir
que ambos enxerguem exatamente o mesmo conjunto de containers.
"""
import os
from typing import List, Optional

# Containers "principais" do próprio projeto (ignora outros containers/stacks que
# possam existir no mesmo host Docker, como zapvoice, chatwoot, etc.).
# Um container é considerado deste projeto se o nome for IGUAL a um dos valores
# abaixo (ambiente local, onde o container_name é fixo) OU COMEÇAR com
# "<valor>." (ambiente Swarm/produção, onde o nome vira "<service>.<slot>.<id>").
# Pode ser customizado via variável de ambiente LOG_VIEWER_CONTAINERS (separado por vírgula).
DEFAULT_PROJECT_CONTAINERS = [
    "backend-agente-local", "agentes_backend",
    "worker-agente-local", "agentes_worker",
    "frontend-agente-local", "agentes_frontend",
]


def get_allowed_container_prefixes() -> List[str]:
    raw = os.getenv("LOG_VIEWER_CONTAINERS", "")
    values = [v.strip() for v in raw.split(",") if v.strip()]
    return values or DEFAULT_PROJECT_CONTAINERS


def is_project_container(name: str, allowed_prefixes: List[str]) -> bool:
    return any(name == prefix or name.startswith(f"{prefix}.") for prefix in allowed_prefixes)


def get_docker_client():
    """Levanta ImportError/exceções da lib docker para quem chamar decidir como tratar."""
    import docker
    client = docker.from_env(timeout=3)
    client.ping()
    return client


def resolve_target_containers(client, containers: Optional[str] = None):
    """
    Retorna os containers-alvo. Se 'containers' não for informado, restringe
    automaticamente aos containers principais deste projeto (ver
    DEFAULT_PROJECT_CONTAINERS / LOG_VIEWER_CONTAINERS), detectando dinamicamente
    a stack do Docker Swarm se ativa, ou caindo para o comportamento legado.
    """
    all_containers = client.containers.list(all=True)
    if containers:
        wanted_names = {n.strip() for n in containers.split(",") if n.strip()}
        return [c for c in all_containers if c.name in wanted_names]

    # 1. Tentar detectar dinamicamente a stack do Swarm ativa a partir das labels do backend
    stack_name = None
    
    # Método A: Ler o cgroup do processo do container para identificar o ID do container rodando
    try:
        container_id = None
        if os.path.exists("/proc/self/cgroup"):
            with open("/proc/self/cgroup", "r") as f:
                for line in f:
                    if "docker" in line or "kubepods" in line or "actions-runner" in line:
                        parts = line.strip().split("/")
                        if len(parts) > 1:
                            last_part = parts[-1]
                            if len(last_part) == 64 and all(ch in "0123456789abcdef" for ch in last_part):
                                container_id = last_part
                                break
        if container_id:
            my_container = client.containers.get(container_id)
            stack_name = my_container.labels.get("com.docker.stack.namespace")
    except Exception:
        pass

    # Método B: Fallback buscando nas labels de qualquer container do backend rodando no host
    if not stack_name:
        for c in all_containers:
            if c.status == "running" and ("backend" in c.name or "backend" in c.labels.get("com.docker.swarm.service.name", "")):
                stack_name = c.labels.get("com.docker.stack.namespace")
                if stack_name:
                    break

    # Se a stack do Swarm for identificada, filtramos os containers apenas por ela (dinâmico e sem falsos-positivos)
    if stack_name:
        return [c for c in all_containers if c.labels.get("com.docker.stack.namespace") == stack_name]

    # 2. Fallback clássico para ambiente local
    allowed_prefixes = get_allowed_container_prefixes()
    return [c for c in all_containers if is_project_container(c.name, allowed_prefixes)]
