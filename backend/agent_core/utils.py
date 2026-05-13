import re

# Chaves internas do contexto que nunca devem ser expostas no debug/Raio-X
INTERNAL_CTX_KEYS = frozenset(("session_id", "thread_id", "agent_id"))

def sanitize_phone_number(phone: str) -> str:
    """Remove todos os caracteres não numéricos de uma string de telefone."""
    if not phone:
        return ""
    return re.sub(r"\D", "", str(phone))
