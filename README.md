# 🤖 Plataforma de Agentes de IA para Automação

Esta é uma solução completa para criação, gerenciamento e treinamento de agentes de IA "version": "1.7.4", integrando RAG (Retrieval-Augmented Generation), automação de calendário e ferramentas de fine-tuning.



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

## ✨ Novidades da Versão (v1.7.3)

Esta versão traz melhorias críticas de UI/UX e testes na interface de teste do chat (ChatPlayground):
- **Limpeza Imediata de Preview de Imagem**: O preview de imagens selecionadas na caixa de entrada do chat agora desaparece instantaneamente quando o usuário clica em enviar (ou aperta Enter), ao mesmo tempo em que a caixa de entrada de texto é limpa. O upload do arquivo ocorre de forma transparente em segundo plano, melhorando consideravelmente a percepção de performance e a experiência de uso.
- **Correção Estética de Preview de Imagem (Glassmorphism)**: Ajuste fino no container de preview utilizando Glassmorphism com efeito blur (`backdrop-filter: blur(10px)`), limites dimensionais estritos para imagens de alta resolução (`64px` x `64px` com `object-fit: cover`) e botão de remover com feedback hover suave.
- **Suíte de Testes do ChatPlayground Estabilizada**: Criação e atualização de testes unitários que cobrem a montagem do preview, metadados da imagem, e validação rigorosa de que o preview é limpo instantaneamente ao enviar a mensagem. Os testes foram atualizados com seletores e expressões regulares robustas.
## ✨ Novidades da Versão (v1.7.4)

Esta versão consolida grandes evoluções no sistema, incluindo o controle financeiro de custos e segurança de mensagens:
- **Filtragem de Custos Zerados no Painel Financeiro**: O endpoint `/financial/report` agora filtra e oculta automaticamente registros com custo de interações igual a `R$ 0.00`, limpando a visualização de agentes inativos.
- **Exibição de Custos Formatada com Duas Casas Decimais**: Ajuste completo na interface (frontend) para exibir valores de custos com exatamente 2 casas decimais (ex: `R$ 15.90` em vez de `R$ 15.9194` ou 4/5 casas decimais).
- **Detecção e Isolamento de Mensagens Automáticas**: O motor de triagem do Pre-Router AI identifica saudações e avisos automáticos externos, respondendo com fallback configurado e isolando estes eventos (`is_automatic=True`) para não contaminar o contexto RAG.
- **Respostas de Saudação de Continuação**: O robô agora envia saudações amigáveis curtas em interações contínuas para manter a naturalidade, evitando repetir a mensagem inicial longa do agente.
- **Flexibilização de Dúvidas Sem Resposta**: Regra de Ouro otimizada no Agente principal para permitir respostas contextuais ricas baseadas no prompt de sistema antes de recorrer à inbox de dúvidas sem resposta.
- **Fluxo Premium de Convites de Usuários**: Substituição do cadastro direto por convites expiráveis (7h, 14h, 24h e 48h) com tabela de gestão, revogação manual e tela de registro com Glassmorphism e tratamento de e-mail duplicado.


### Novidades Anteriores (v1.8.0)
- **Exclusão Parcial de Leads (Desqualificação)**: Permite desqualificar leads diretamente da listagem clicando no ícone de lixeira, abrindo um modal Premium de confirmação. A ação limpa as respostas de qualificação, score, justificativa, classificação e remove a tag `"qualificado"` do contato, sem deletar o contato do banco.
- **Identificação do Agente Qualificador**: Exibe um badge com o nome do agente robô responsável pela qualificação do lead no cabeçalho do card de lead qualificado (`🤖 Agente: Nome`).
- **Fuso Horário de Brasília**: Todas as datas de listagem e alteração de leads na tela de Lead Scoring são convertidas na API para o fuso horário de Brasília (`America/Sao_Paulo` / UTC-3).
- **Maximização das Diretrizes de Lead Scoring**: Inclusão de botão "Maximizar" ao lado do campo de texto de Diretrizes que abre um editor amplo em tela cheia (85% da largura da tela) com sincronização em tempo real e backdrop blur Premium.

### Novidades e Ajustes Recentes (v1.7.2)
- **Resiliência e Conexão PostgreSQL**: Desativação inteligente de prepared statements em cache (`prepared_statement_cache_size=0`) para conexões assíncronas PostgreSQL, mitigando erros do tipo `InvalidCachedStatementError` após alterações dinâmicas de esquema.
- **Saudações Inteligentes com Histórico no Pre-Router**: O motor de triagem do `Pre-Router AI` agora classifica e responde corretamente com saudações diretas a cumprimentos curtos e isolados (como "oi", "olá", "oie", "bom dia"), mesmo que a conversa já contenha histórico de interações anteriores.
- **Sincronização de Etiquetas Chatwoot em Lote e Webhooks**: Integração e persistência bidirecional das etiquetas do Chatwoot no banco local de leads de forma automática nos webhooks, no pipeline de qualificação, e por meio da rota de sincronização em lote `/sync-all` para todos os leads.

### Novidades Anteriores (v1.7.0)
- **Tratamento e Remoção de Anúncios e Pergunta Inicial no Primeiro Contato**: Remoção automática e case-insensitive de mensagens de anúncios cadastrados (`ignore_messages`) na primeira interação de um lead. Se o lead enviar anúncio + uma pergunta, o robô responde à pergunta utilizando a IA e anexa a pergunta de início de atendimento (`initial_question_message`) no final da mensagem. Se o lead enviar apenas o anúncio (ou anúncio + saudação simples), o robô responde com a saudação padrão e anexa a pergunta inicial no final.
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
- **Priorização do GPT-4o-Audio no Motor de Mídia**: O backend agora tenta transcrever arquivos de áudio enviados pelo cliente final usando o modelo premium de áudio `gpt-4o-audio-preview` com codificação base64, garantindo uma transcrição de altíssima fidelidade. Caso ocorra alguma falha ou alucinação, o pipeline de transcrição realiza um fallback automático e transparente para o `whisper-1`.
- **Resiliência e Tolerância a Falhas na Automação de Expiração de Janela 24h**: Ajuste na tarefa periódica `check_window_expiry` para ignorar erros de API ou timeouts com o Chatwoot sem afetar futuras execuções. A verificação do fuso horário agora é imune a conflitos entre bancos de dados PostgreSQL e SQLite local utilizando timezone nativo do banco.
- **Exibição Dinâmica e Premium de Etiquetas Chatwoot**: Integração visual no modal de contatos do Webhook Manager que parseia e renderiza as etiquetas (tags) sincronizadas do Chatwoot ao lado do telefone de cada contato na lista e na visão de accordion expandido com badges em estilo Glassmorphism Premium.

---

## 📦 Deploy e Imagens Docker

*(Aviso: Conforme as regras do projeto, nunca gerar ou dar push em tags `latest` no Docker Hub; use sempre tags de versão estritas.)*

### Backend
1. **Build:** `docker build -t aryarajalves/configurar-agentes-ia:backend-1.7.4 ./backend`
2. **Push:** `docker push aryarajalves/configurar-agentes-ia:backend-1.7.4`

### Frontend
1. **Build:** `docker build --target production -t aryarajalves/configurar-agentes-ia:frontend-1.7.4 ./frontend`
2. **Push:** `docker push aryarajalves/configurar-agentes-ia:frontend-1.7.4`





---

## 📂 Organização de Pastas
- `/backend`: Lógica central, APIs e **suíte de testes**.
- `/frontend`: Dashboard e Interface do Usuário.
- `/docs`: Planos de implementação e evoluções (Arquivado).
- `/widget`: Script para integração do chat em sites externos.