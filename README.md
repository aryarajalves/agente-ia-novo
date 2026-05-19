# 🤖 Plataforma de Agentes de IA para Automação

Esta é uma solução completa para criação, gerenciamento e treinamento de agentes de IA "version": "1.6.0", integrando RAG (Retrieval-Augmented Generation), automação de calendário e ferramentas de fine-tuning.



---

## 🏗️ Estrutura do Ecossistema

-   **Backend:** FastAPI com PostgreSQL (SQLAlchemy + pgvector).
-   **Frontend:** Dashboard Admin em React + Vite.
-   **Database:** PostgreSQL 15 com suporte a vetores para busca semântica.
-   **Infra:** Dockerizada para fácil deploy e escalabilidade.

---

## 🚀 Como Iniciar (Setup Local)

### 1. Requisitos
- [Docker](https://www.docker.com/) e [Docker Compose](https://docs.docker.com/compose/install/) instalados.

### 2. Configuração de Variáveis
Crie um arquivo `.env` na raiz do projeto:

```env
OPENAI_API_KEY=sua_chave_aqui
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=ai_agent_db
POSTGRES_PORT_EXTERNAL=5433
```

### 3. Rodar a Aplicação
Suba os containers em modo de desenvolvimento:

```bash
docker-compose -f docker/docker-compose-local.yml up -d --build

docker-compose -f docker/docker-compose-local.yml up -d --build frontend backend

```

- **Frontend:** [http://localhost:5300](http://localhost:5300)
- **API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🧪 Suíte de Testes

Para garantir a estabilidade do sistema, você pode executar a suíte completa de testes (Backend e Frontend) de forma unificada.

### 1. Testes Locais (Rápido)
Ideal para o dia a dia de desenvolvimento. Requer as dependências instaladas localmente.
```bash
# Via PowerShell
./test_all.ps1

# Via NPM
npm test
```

### 2. Testes via Docker (Ambiente Real)
Recomendado antes de realizar commits ou deploy. Garante que o ambiente de teste seja idêntico ao de produção.
```bash
# Via PowerShell
./test_docker.ps1

# Via NPM
npm run test:docker
```

### 3. Testes Individuais
Se precisar rodar apenas uma parte específica:
```bash
# Apenas Backend
npm run test:backend

# Apenas Frontend
npm run test:frontend
```

---

## ✨ Novidades da Versão (v1.6.8)

Esta versão traz melhorias críticas no fluxo de automação, qualificação e suporte ao cliente:
- **Qualificação de Leads Avançada:** O agente coleta de forma sequencial dados como Nome, E-mail e Empresa, acionando o pipeline ao concluir a qualificação.
- **Integração Multitag Chatwoot:** Permite selecionar múltiplas etiquetas no frontend e sincronizá-las diretamente na conversa do contato no Chatwoot após a qualificação do lead.
- **Protocolo Resiliente de Dúvidas (Inbox):** Respostas em dois turnos para dúvidas inexistentes na base. O agente informa que buscará a equipe (Turno 1) e confirma o registro na Inbox ao receber concordâncias curtas (Turno 2), impedindo loops infinitos e alucinações.

---

## 📦 Deploy e Imagens Docker

### Backend
1. **Build:** `docker build -t aryarajalves/configurar-agentes-ia:backend-1.6.8 ./backend`
2. **Push:** `docker push aryarajalves/configurar-agentes-ia:backend-1.6.8`

### Frontend
1. **Build:** `docker build --target production -t aryarajalves/configurar-agentes-ia:frontend-1.6.8 ./frontend`
2. **Push:** `docker push aryarajalves/configurar-agentes-ia:frontend-1.6.8`



---

## 📂 Organização de Pastas
- `/backend`: Lógica central, APIs e **suíte de testes**.
- `/frontend`: Dashboard e Interface do Usuário.
- `/docs`: Planos de implementação e evoluções (Arquivado).
- `/widget`: Script para integração do chat em sites externos.