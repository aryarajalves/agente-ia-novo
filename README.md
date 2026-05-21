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

## ✨ Novidades da Versão (v1.7.0)

Esta versão traz melhorias críticas no fluxo de automação, qualificação, suporte e segurança:
- **Tratamento Estrito de Erro de Envio no Webhook**: Casos de falha ou timeout de rede com a API do Chatwoot no envio de respostas agora marcam o status do evento de webhook como `error` (e não mais `completed`). Isso evita que envios malsucedidos contaminem o histórico de contexto do agente.
- **Desduplicação Consecutiva no Histórico de Contexto**: Implementação de filtragem automática no histórico do chat para remover mensagens consecutivas idênticas com o mesmo role e conteúdo. Isso impede que a IA alucine ou faça recapitulações indesejadas causadas por loops ou re-disparos de mensagens no banco.
- **Qualificação de Leads Avançada:** O agente coleta de forma sequencial dados como Nome, E-mail e Empresa, acionando o pipeline ao concluir a qualificação.
- **Integração Multitag Chatwoot:** Permite selecionar múltiplas etiquetas no frontend e sincronizá-las diretamente na conversa do contato no Chatwoot após a qualificação do lead.
- **Protocolo Resiliente de Dúvidas (Inbox):** Respostas em dois turnos para dúvidas inexistentes na base. O agente informa que buscará a equipe (Turno 1) e confirma o registro na Inbox ao receber concordâncias curtas (Turno 2), impedindo loops infinitos e alucinações.
- **Painel de Segurança do Agente Jaime (Melhorias de Estabilidade):**
  - **Injeção Ativa de Regras no Prompt:** Injeção automática das blacklists de concorrentes, tópicos proibidos, políticas de descontos e complexidade do estilo de linguagem (Simples / Padrão / Técnico) no system prompt do agente principal.
  - **Auditoria por IA (Double-Check):** Lógica secundária que audita as respostas com fallback resiliente encadeado de modelos (Modelo Simples -> Modelo Fallback Simples -> GPT-4o-Mini) e substitui respostas ofensivas ou fora da política por mensagens amigáveis de recusa.
  - **Proteção Anti-Loop (Bot Defense):** Novo serviço que limita o máximo de interações e detecta loops semânticos por similaridade de cosseno de embeddings de mensagens anteriores do lead, pausando a automação e aplicando etiquetas de handoff no Chatwoot.
- **Aba Whitelabel Customizada (Premium):** Alinhamento perfeito dos seletores de cores e inputs hexadecimais na mesma linha, design flutuante e responsivo para o botão de copiar snippet na caixa de código de instalação (snippet box), toast de feedback nativo (`app:toast`) ao copiar o código para a área de transferência, e remoção completa do botão de testar widget.
- **Ocultação de Habilidade no Frontend (Fluxo de Suporte):** Ocultação da ferramenta nativa `transferir_robo` na interface do dropdown de Habilidades nas configurações do Agente, mantendo-a totalmente integrada e acionável por meio do painel de Atendimento Humano (ao fechar/resolver o ticket para retornar o controle ao robô), com suporte robusto e tratamento nativo da sincronização de etiquetas Chatwoot mapeado na pipeline do backend.

---

## 📦 Deploy e Imagens Docker

### Backend
1. **Build:** `docker build -t aryarajalves/configurar-agentes-ia:backend-1.7.0 ./backend`
2. **Push:** `docker push aryarajalves/configurar-agentes-ia:backend-1.7.0`

### Frontend
1. **Build:** `docker build --target production -t aryarajalves/configurar-agentes-ia:frontend-1.7.0 ./frontend`
2. **Push:** `docker push aryarajalves/configurar-agentes-ia:frontend-1.7.0`




---

## 📂 Organização de Pastas
- `/backend`: Lógica central, APIs e **suíte de testes**.
- `/frontend`: Dashboard e Interface do Usuário.
- `/docs`: Planos de implementação e evoluções (Arquivado).
- `/widget`: Script para integração do chat em sites externos.