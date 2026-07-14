# Integridade de Esquema (Banco de Dados)

Ao alterar `backend/app/models.py` adicionando tabelas/colunas:

1. Atualizar o model.
2. Registrar a mudança neste projeto em um `DATABASE_SCHEMA_LOG.md` na raiz (criar se não existir), com data, tabela afetada e colunas novas.
3. Como o projeto usa `Base.metadata.create_all` no startup (sem Alembic ativo ainda), novas colunas em tabelas já existentes em produção exigem migração manual ou ativação do Alembic — avisar o usuário nesse caso.
