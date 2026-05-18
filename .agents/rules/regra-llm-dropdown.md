# Regra de Criação de Dropdowns de Modelos de IA (LLMs)

Toda vez que o usuário pedir para criar, atualizar ou modificar um dropdown ou seletor de modelos de IA (LLMs) na interface (frontend) ou backend, você deve obrigatoriamente seguir este protocolo:

1. **Pesquisar na Internet**: Use a ferramenta de pesquisa na internet (`search_web`) para verificar quais são os modelos de IA comerciais mais recentes lançados oficialmente pelas principais provedoras (OpenAI, Anthropic, Google, etc.).
2. **Filtrar por chaves de API configuradas (.env)**: Apenas apresente no dropdown os modelos cujas chaves de API correspondentes estejam configuradas nas variáveis de ambiente do sistema (`.env` ou `.env.example`).
   - Exemplos de chaves: `OPENAI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`.
3. **Manter compatibilidade com chaves ausentes**: Se uma chave não estiver configurada no ambiente (ex: `ANTHROPIC_API_KEY` ausente), o modelo correspondente (ex: Claude) **NÃO** deve ser exibido como opção no dropdown para evitar falhas de execução ao usuário final.
