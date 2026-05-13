"""
database.py — Proxy de Compatibilidade (MODULARIZADO)
=====================================================
Este arquivo redireciona os imports para o novo pacote em ./database/
para manter a compatibilidade com o código existente.

✅ Lógica de conexão movida para: database/connection.py
✅ Lógica de sincronização movida para: database/sync.py
✅ Lógica de seeds movida para: database/seeds.py
"""

from database.connection import (
    DATABASE_URL, engine, engine_sync, async_session, 
    SessionLocal, Base, get_db
)
from database import init_db

# Nota: O init_db agora faz auto-sincronização de colunas
# baseando-se no que está escrito no models.py.
