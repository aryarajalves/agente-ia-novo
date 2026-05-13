# Regras de Negócio do Sistema

## 🌐 Conectividade e URLs
- **Redirecionamento Global:** Todas as URLs geradas pelo sistema (Webhooks, Widgets de Chat, Callbacks de OAuth) devem obrigatoriamente utilizar o endereço do túnel (Cloudflare) configurado em `BACKEND_URL` / `VITE_API_URL` em vez de `localhost`.
- **Sincronização de Ambiente:** As variáveis de ambiente `BACKEND_URL` e `VITE_API_URL` no arquivo `.env` devem ser mantidas em sincronia para garantir que o frontend e o backend falem a mesma "língua" pública.

- [ ] [NOVO] Como devemos tratar registros antigos na tabela `webhook_events` (Histórico de Disparos) que não possuem o campo `message_type`? Atualmente, eles exibem um ícone padrão de texto (📝). Devemos manter assim ou exibir um aviso de "Legado/Desconhecido"?

## 🔗 Slugs e Integrações
- **Formato e Limites:** Os slugs (tokens) de integração e memória são gerados automaticamente, mas podem ser editados pelo usuário. Não existe um limite de caracteres definido para esses campos.
- **Obrigatoriedade:** Slugs não podem ser deixados em branco durante a criação de uma integração.


## 👥 Gestão de Usuários
- [x] O sistema utiliza um fluxo de convites para novos usuários.
- [x] Administradores podem gerenciar permissões e agentes.

## 🤖 Agentes e Automação
- [x] Suporte a RAG via pgvector.
- [x] Integração com Google Calendar via OAuth.

## 📝 Perguntas e Decisões Pendentes
- [x] [NOVO] Existe algum ambiente onde o uso de `localhost:8002` ainda seja obrigatório para o frontend em vez do túnel?
  - Resposta: No ambiente de desenvolvimento local, o frontend acessa o backend via `localhost:8002`. O erro de agentes sumindo foi causado por um mismatch (estava 8000 no config.js).
- [ ] [NOVO] As rotas `/agents/{id}/generate-description` e `/agents/{id}/duplicate` foram removidas ou ainda precisam ser implementadas? Elas constam nos testes e em partes do frontend, mas não estão no backend atual (causando 404).
- [x] [NOVO] Se o áudio/imagem for permitido nas configurações, a automação deve realmente PARAR e apenas avisar o tipo, ou ela deveria tentar processar (ex: transcrever áudio ou descrever imagem) no futuro?
  - Resposta: No futuro deve processar (baixar e transcrever), mas por enquanto deve apenas parar e identificar o tipo.
- [x] [NOVO] Quando uma mídia for bloqueada (ex: vídeo ou documento), devemos enviar uma mensagem automática ao cliente final avisando que o formato não é aceito, ou apenas registrar isso no log interno da pipeline?
  - Resposta: Apenas registrar no log interno da pipeline, não enviar nada ao cliente final.
- [x] Qual deve ser o tempo padrão de expiração do Toast (atualmente 3 segundos)?
  - Resposta: 5 segundos.
- [x] Deseja que ao expandir um contato, todos os outros se fechem automaticamente (comportamento de Accordion)?
  - Resposta: Sim, deve fechar os outros ao abrir um novo.
- [ ] [NOVO] Deseja que a automação de retorno ao robô envie um log específico para o painel de histórico do agente informando que a IA reassumiu o controle?
