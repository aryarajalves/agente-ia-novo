
# Log de Alterações no Banco de Dados

Este arquivo registra todas as alterações manuais de schema (ALTER TABLE) realizadas no projeto.

| Data | Tabela | Coluna(s) | Script de Migração | Descrição |
|------|--------|-----------|--------------------|-----------|
| 2026-05-10 | webhook_configs | labels_on_message | add_labels_on_message_column.py | Adição de suporte para etiquetas automáticas em cada mensagem. |
| 2026-05-11 | TODAS | Varias (TIMESTAMP) | migrate_all_timezones.py | Conversão global de TIMESTAMP para TIMESTAMPTZ para suporte a fuso horário de Brasília. |
| 2026-05-11 | prompt_drafts | description | add_prompt_draft_description.py | Adição de campo de descrição para versões de prompt. |
| 2026-05-13 | support_requests | webhook_config_id | add_webhook_id_to_support.py | Vincular suportes ao canal de origem para automação de retorno. |
| 2026-05-15 | scheduled_triggers, message_status | TODAS | create_trigger_tables.py | Criação das tabelas base para o sistema de disparos e follow-up, corrigindo erro de deleção de contatos. |
