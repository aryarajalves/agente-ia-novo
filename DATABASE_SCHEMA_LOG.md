
# Log de Alterações no Banco de Dados

Este arquivo registra todas as alterações manuais de schema (ALTER TABLE) realizadas no projeto.

| Data | Tabela | Coluna(s) | Script de Migração | Descrição |
|------|--------|-----------|--------------------|-----------|
| 2026-05-10 | webhook_configs | labels_on_message | add_labels_on_message_column.py | Adição de suporte para etiquetas automáticas em cada mensagem. |
| 2026-05-11 | TODAS | Varias (TIMESTAMP) | migrate_all_timezones.py | Conversão global de TIMESTAMP para TIMESTAMPTZ para suporte a fuso horário de Brasília. |
| 2026-05-11 | prompt_drafts | description | add_prompt_draft_description.py | Adição de campo de descrição para versões de prompt. |
| 2026-05-13 | support_requests | webhook_config_id | add_webhook_id_to_support.py | Vincular suportes ao canal de origem para automação de retorno. |
| 2026-05-15 | scheduled_triggers, message_status | TODAS | create_trigger_tables.py | Criação das tabelas base para o sistema de disparos e follow-up, corrigindo erro de deleção de contatos. |
| 2026-05-17 | webhook_configs | delete_labels | add_delete_labels_column.py | Adição de campo para substituir as etiquetas do Chatwoot no reset/auto-deleção do contato. |
| 2026-05-17 | users | company_name, company_logo, company_logo_size | add_whitelabel_columns.py | Colunas de customização para a funcionalidade de White-label (marca branca). |
| 2026-05-19 | agent_config, leads | qualification_labels, respostas_qualificacao | add_qualification_responses_column.py | Adição de colunas para suporte a qualificação de leads e armazenamento de respostas. |
| 2026-05-19 | webhook_configs | chatwoot_inbox_id | add_chatwoot_inbox_id_column.py | Adição de suporte para filtrar webhooks do Chatwoot por ID do Inbox. |
| 2026-05-21 | agent_config, leads | qualification_criteria, lead_score, lead_classification, lead_justification | add_lead_score_columns.py | Colunas para suporte a Lead Scoring (critérios, pontuação, classificação e justificativa). |
| 2026-05-21 | TODAS (Leads) | qualified_by_agent_id | add_qualified_by_agent_id_column.py | Coluna para rastrear qual agente realizou a qualificação do lead. |
| 2026-05-21 | user_invites | TODAS | create_user_invites_table.py | Criação da tabela de convites de usuários expiráveis. |
| 2026-05-22 | webhook_events | is_automatic | add_is_automatic_column.py | Adição de coluna para identificar se a mensagem do webhook é de envio automático do contato. |




