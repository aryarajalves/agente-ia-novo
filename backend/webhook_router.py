"""
webhook_router.py — Shim de Compatibilidade (Legado)
===================================================
Este arquivo existe para compatibilidade com testes legados que fazem:
`from webhook_router import receive_webhook, receive_memory_webhook, WebhookConfigModel`

A implementação real agora está em `webhooks/router.py`.
"""

from webhooks.router import (
    receive_webhook,
    receive_memory_webhook,
    WebhookConfigModel,
    # Adicione outros se os testes reclamarem
)

# Se houver funções internas que os testes usavam (ex: _upsert_lead), 
# elas podem precisar ser importadas do service.py
from webhooks.service import upsert_lead as _upsert_lead
