# Segurança e Configuração (.env)

- Toda variável de ambiente nova (`os.getenv(...)` ou campo em `app/config.py`) deve ser adicionada em `backend/.env.example` com valor de exemplo (nunca o valor real).
- `backend/.env.example` é a fonte de verdade de configuração do projeto.
- Nunca commitar `backend/.env` real nem expor segredos em logs.
- Ao entregar uma tarefa que adicionou variáveis novas, informar explicitamente quais o usuário precisa preencher.
