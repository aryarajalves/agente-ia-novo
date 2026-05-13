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

## 📦 Deploy e Imagens Docker

### Backend
1. **Build:** `docker build -t aryarajalves/configurar-agentes-ia:1.5.7-backend ./backend`
2. **Push:** `docker push aryarajalves/configurar-agentes-ia:1.5.7-backend`



### Frontend
1. **Build:** `docker build --target production -t aryarajalves/configurar-agentes-ia:1.5.7-frontend ./frontend`
2. **Push:** `docker push aryarajalves/configurar-agentes-ia:1.5.7-frontend`



---

## 📂 Organização de Pastas
- `/backend`: Lógica central, APIs e **suíte de testes**.
- `/frontend`: Dashboard e Interface do Usuário.
- `/docs`: Planos de implementação e evoluções (Arquivado).
- `/widget`: Script para integração do chat em sites externos.