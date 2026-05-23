# 🤖 Plataforma de Agentes de IA para Automação

Esta é uma solução completa para criação, gerenciamento e treinamento de agentes de IA "version": "1.8.5", integrando RAG (Retrieval-Augmented Generation), automação de calendário e ferramentas de fine-tuning.



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

## ✨ Novidades da Versão (v1.8.5)

Esta versão traz o envio da saudação padrão para anúncios puros no primeiro contato de leads:
- **Envio de Saudação para Anúncios Puros**: Correção no fluxo de anúncios do webhook (`webhook_tasks.py`). Agora, contatos que iniciam conversas vindos de anúncios configurados e sem perguntas adicionais (anúncio puro) não são mais interrompidos com status `ignored`. A pipeline continua a execução e responde o lead com a saudação inicial do agente.
- **Limpeza do Histórico de Leads**: O trecho de anúncio correspondente continua sendo limpo na tabela local de leads (`leads_table`) para evitar poluição no RAG e histórico local.
- **Suíte de Testes Unitários Atualizada**: Atualização do teste `test_process_webhook_automation_ad_simple` em `backend/tests/test_ad_webhook_pipeline.py` para validar o status `completed` e a chamada de envio da saudação via Chatwoot.

---

## ✨ Novidades da Versão (v1.8.4)

Esta versão traz o tratamento inteligente e dinâmico de reações/emojis negativos enviados pelo cliente no Chatwoot:
- **Tratamento de Emojis Negativos no Chatwoot**: Integração programática no Pre-Router para detectar emojis negativos (ex: 👎, 🖕, 😡). 
- **Lógica de Etiqueta Dupla e Transição Humana**:
  - No primeiro envio consecutivo de emoji negativo, o robô responde de forma empática sem acionar a LLM principal e aplica a etiqueta de feedback negativo configurada no painel de webhooks (padrão: `feedback_negativo`). A automação de IA continua ativa.
  - No segundo envio consecutivo de emoji negativo (detectado pela presença da tag na conversa), o robô envia uma mensagem de transição amigável e aplica a etiqueta de ignorar (padrão: `humano`), pausando a automação da IA e passando o controle para o atendimento humano.
- **Configuração no Painel de Webhooks**: Campo configurável `"Feedback Negativo (1º emoji)"` adicionado na aba Chatwoot do modal de edição de webhook (com design Glassmorphism e seletor dinâmico de etiquetas).
- **Suíte de Testes Unitários e E2E**: Cobertura de testes unitários do backend (`test_negative_emojis.py`) e validação visual via automação de screenshots com Playwright.

---

## ✨ Novidades da Versão (v1.8.3)

Esta versão traz a funcionalidade de gravação e transcrição de áudio com feedback visual em tempo real no Chat Playground:
- **Feedback de Transcrição em Tempo Real (Web Speech API)**: Integração da SpeechRecognition API nativa do navegador no hook `useChat`. Ao gravar voz, o texto é transcrito localmente em tempo real e exibido dinamicamente na caixa de input de mensagem.
- **Transcrição de Alta Fidelidade com Fallback Resiliente**: Envio assíncrono do áudio binário gravado para o backend via endpoint `/transcribe-audio`, processado pelo Whisper-1 da OpenAI. Caso o navegador envie em um formato incompatível, o backend realiza a conversão automática via `ffmpeg` para MP3 em tempo de execução.
- **Envio Automotivo e Limpeza de Input**: Assim que a transcrição final do Whisper é obtida, a mensagem é disparada automaticamente no chat e a caixa de entrada é limpa.
- **Interrupção Silenciosa ao Enviar Texto**: Se o usuário enviar uma mensagem de texto manualmente (digitando ou enviando o texto da transcrição acumulado) enquanto a gravação de áudio estiver ativa, o sistema desliga o microfone e cancela a gravação na mesma hora de forma silenciosa, prevenindo envios duplicados ou redundantes do Whisper.
- **Suíte de Testes Unitários de Ponta a Ponta**: Cobertura estrita e completa com Vitest para o comportamento do SpeechRecognition/MediaRecorder no frontend e Pytest para os endpoints e rotas de fallback no backend.

---

## ✨ Novidades da Versão (v1.8.2)

Esta versão traz melhorias na detecção de mensagens automáticas e no fluxo de upload do histórico de transcrições:
- **Tratamento Amigável de Status de Envio (AssemblyAI)**: O frontend agora trata o status `completed` de uploads de áudio/vídeo, exibindo a badge `"⏳ Enviado"` no histórico de transcrições durante a transição em cache de 3 segundos, eliminando a exibição temporária da badge de erro `"❌ Erro no Envio"`.
- **Detecção de Mensagens Automáticas de Contatos**: A pipeline do Pre-Router AI detecta mensagens iniciais automáticas de contatos (como auto-responders comerciais ou mensagens de catálogo/ausência) e dispara a saudação inicial configurada (ou padrão) para o cliente.
- **Suíte de Testes Unitários de Frontend e Visual**: Inclusão de cobertura de testes no Vitest para o status `completed` no componente de tabela de transcrições, além de automação visual via Playwright.

---

## ✨ Novidades da Versão (v1.8.1)

Esta versão traz a sincronização proativa e resiliente dos contatos do ZapVoice:
- **Sincronização Proativa de Contatos e Etiquetas no ZapVoice**: Ao gerar e preparar o envio de uma resposta de IA ao Chatwoot, o sistema atualiza proativamente o contato do lead correspondente no banco de dados local Postgres (tabela configurada em `leads_table` no webhook). Os campos atualizados incluem o nome do contato, telefone, a última resposta enviada pelo agente, o timestamp da atualização e a lista de etiquetas ativas da conversa no Chatwoot.
- **Resiliência e Tolerância a Falhas de Conectividade**: Caso a chamada síncrona para obter etiquetas no Chatwoot falhe (falha de rede, timeout, ou erro de status HTTP), o fluxo é tolerante a falhas, realizando o update do lead sem alterar a coluna `labels`, preservando o conjunto de etiquetas pré-existente no banco local de dados.
- **Suíte de Testes Unitários de Integração e Atualização Proativa**: Criação de testes unitários que cobrem a função síncrona de consulta ao Chatwoot e garantem a correta execução da query SQL de atualização de leads nas tarefas em background (Celery).

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
- **Tratamento e Descarte de Mensagens de Anúncio**: A pipeline de IA agora intercepta contatos cujo primeiro envio corresponda a um anúncio cadastrado. Se for anúncio puro (sem pergunta acoplada), o robô não envia resposta no Chatwoot, define o status do evento de webhook como `'ignored'`, limpa a coluna de mensagem na tabela local de leads e limpa o debounce de mensagens no Redis. Se a mensagem for mista (anúncio + pergunta), a pipeline remove a parte de anúncio e responde apenas à pergunta limpa, gravando no histórico local apenas a pergunta tratada.

---

## ✨ Novidades da Versão (v1.7.5)

Esta versão traz melhorias no encerramento de conversas após o registro de dúvidas sem resposta, além de refinamentos de UI/UX no painel de testes do chat:
- **Encerramento Amigável de Conversa após Registro de Dúvida**: Quando o robô informa que verificará uma pergunta com a equipe, respostas curtas contendo concordâncias (como "tá ótimo", "ok", "obrigado", "perfeito") agora encerram a conversa amigavelmente com uma confirmação conclusiva. Isso evita que o agente repita em loop a pergunta "como posso te ajudar com outro assunto agora?".
- **Nova Cobertura de Testes Unitários de Fluxo**: Inclusão de testes unitários em `backend/tests/test_initial_messages.py` para validar o comportamento conclusivo diante de concordâncias curtas no segundo turno.
- **Posicionamento e Estilização Premium do Toast de Reset**: O toast de notificação de reset de sessão ("Sessão resetada com sucesso!") no ChatPlayground foi reposicionado do rodapé da tela para o canto superior direito do viewport. A renderização agora utiliza React Portals para garantir posicionamento fixed perfeito no `document.body`, imune a transbordos ou transformações do contêiner pai, e adota design de Glassmorphism Premium com borda neon translúcida.
- **Sincronização de Expiração do Toast com Regras de Negócio**: O timeout de exibição do toast de reset no ChatPlayground foi sincronizado para 5 segundos (5000ms), atendendo às definições de negócio especificadas no projeto.
- **Suíte de Testes Unitários e Cobertura E2E de Frontend**: Inclusão de testes unitários em `ChatPlayground.test.jsx` com Vitest para simular o clique no botão "Resetar" e validar o surgimento do toast. O script de teste e2e com Playwright (`take_screenshot_chat.spec.js`) foi atualizado para validar o fluxo visual de ponta a ponta e coletar o screenshot comprobatório.



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
1. **Build:** `docker build -t aryarajalves/configurar-agentes-ia:backend-1.8.5 ./backend`
2. **Push:** `docker push aryarajalves/configurar-agentes-ia:backend-1.8.5`

### Frontend
1. **Build:** `docker build --target production -t aryarajalves/configurar-agentes-ia:frontend-1.8.5 ./frontend`
2. **Push:** `docker push aryarajalves/configurar-agentes-ia:frontend-1.8.5`





---

## 📂 Organização de Pastas
- `/backend`: Lógica central, APIs e **suíte de testes**.
- `/frontend`: Dashboard e Interface do Usuário.
- `/docs`: Planos de implementação e evoluções (Arquivado).
- `/widget`: Script para integração do chat em sites externos.