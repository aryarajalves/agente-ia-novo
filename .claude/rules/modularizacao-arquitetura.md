# Modularização e Arquitetura

Backend segue a separação: `routers/` (endpoints), `models.py` (SQLAlchemy), `schemas.py` (Pydantic), `security.py`/`deps.py` (auth), `storage.py` (integração MinIO), `core/` (utilitários como logger). Não misturar lógica de negócio dentro dos routers além do necessário — extrair para funções auxiliares quando crescer.
