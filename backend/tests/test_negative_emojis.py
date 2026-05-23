import pytest
import os
import json
import asyncio
from unittest.mock import patch, MagicMock, AsyncMock
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from models import Base, WebhookConfigModel, WebhookEventModel, AgentConfigModel
from webhook_tasks import process_webhook_automation, run_pre_router_ai

# Configuração do banco de testes SQLite em memória
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

LEADS_TABLE_SQLITE_DDL = """
CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    webhook_config_id INTEGER,
    qualified_by_agent_id INTEGER,
    conta_id TEXT,
    inbox_id TEXT,
    inbox_nome TEXT,
    conversa_id TEXT,
    mensagem_id TEXT,
    contato_id TEXT,
    telefone TEXT,
    labels TEXT,
    contato_nome TEXT,
    mensagem TEXT,
    message_type TEXT DEFAULT 'text',
    link TEXT,
    pode_enviar_mensagem BOOLEAN DEFAULT 1,
    sec_since_last_msg INTEGER,
    ultima_mensagem_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    window_close_processed BOOLEAN DEFAULT 0,
    followup_step INTEGER DEFAULT 0,
    ultima_resposta_agente TEXT,
    ultima_resposta_agente_em TIMESTAMP,
    respostas_qualificacao TEXT,
    lead_score INTEGER,
    lead_classification TEXT,
    lead_justification TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
"""

@pytest.fixture(name="db")
def fixture_db():
    Base.metadata.create_all(bind=engine)
    with engine.begin() as conn:
        conn.execute(text(LEADS_TABLE_SQLITE_DDL))
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.mark.asyncio
async def test_pre_router_shortcut_negative_emoji():
    # Setup mocks
    main_agent = AgentConfigModel(id=1, name="Main", description="Principal", router_simple_model="gpt-4o-mini")
    
    # Executa run_pre_router_ai com emoji negativo
    result = await run_pre_router_ai("👎", [], main_agent, [])
    
    assert result.get("eh_saudacao") is True
    assert result.get("eh_emoji_negativo") is True
    assert "Puxa, sinto muito!" in result.get("resposta_direta")

def test_webhook_task_negative_emoji_first_occurrence(db):
    # Setup
    agent = AgentConfigModel(id=1, name="Test Agent", router_simple_model="gpt-4o-mini")
    db.add(agent)
    db.commit()
    
    config = WebhookConfigModel(
        id=1, 
        name="Test Config", 
        token="token_emoji_1", 
        agent_id=1,
        chatwoot_url="https://chatwoot.example.com",
        chatwoot_api_token="cw_token_123",
        negative_feedback_label="feedback_negativo",
        ignore_by_label="humano"
    )
    db.add(config)
    db.commit()
    
    event = WebhookEventModel(
        id=1, 
        webhook_config_id=1, 
        message_type="text", 
        mensagem="👎", 
        status="received",
        conta_id="1",
        conversa_id="123",
        telefone="5511999998888"
    )
    db.add(event)
    db.commit()

    # Mocks para chamadas assíncronas do chatwoot
    mock_sync = AsyncMock(return_value=(True, [])) # primeira ocorrência: sem a tag ainda
    
    # Previne fechar o banco de dados principal do fixture ao interceptar SessionLocal
    with patch("webhook_tasks.SessionLocal", return_value=db):
        with patch("webhook_tasks.sync_conversation_labels", mock_sync):
            with patch("webhook_tasks._send_chatwoot_message", AsyncMock(return_value=True)):
                process_webhook_automation(event.id)
                
    # Consulta o banco novamente usando uma sessão limpa para checar o status e resposta do evento
    new_db = TestingSessionLocal()
    try:
        updated_event = new_db.query(WebhookEventModel).filter(WebhookEventModel.id == 1).first()
        assert updated_event.status == "completed"
        assert "Puxa, sinto muito!" in updated_event.agent_response
    finally:
        new_db.close()
    
    # Verifica se sync_conversation_labels foi chamado para buscar e depois para adicionar a tag de feedback negativo
    mock_sync.assert_any_call("https://chatwoot.example.com", 1, 123, "cw_token_123")
    mock_sync.assert_any_call("https://chatwoot.example.com", 1, 123, "cw_token_123", to_add=["feedback_negativo"])

def test_webhook_task_negative_emoji_second_occurrence(db):
    # Setup
    agent = AgentConfigModel(id=2, name="Test Agent 2", router_simple_model="gpt-4o-mini")
    db.add(agent)
    db.commit()
    
    config = WebhookConfigModel(
        id=2, 
        name="Test Config 2", 
        token="token_emoji_2", 
        agent_id=2,
        chatwoot_url="https://chatwoot.example.com",
        chatwoot_api_token="cw_token_123",
        negative_feedback_label="feedback_negativo",
        ignore_by_label="humano"
    )
    db.add(config)
    db.commit()
    
    event = WebhookEventModel(
        id=2, 
        webhook_config_id=2, 
        message_type="text", 
        mensagem="🖕", 
        status="received",
        conta_id="1",
        conversa_id="123",
        telefone="5511999998888"
    )
    db.add(event)
    db.commit()

    # Mocks para chamadas assíncronas do chatwoot: desta vez retorna a tag já presente
    mock_sync = AsyncMock(return_value=(True, ["feedback_negativo"]))
    
    with patch("webhook_tasks.SessionLocal", return_value=db):
        with patch("webhook_tasks.sync_conversation_labels", mock_sync):
            with patch("webhook_tasks._send_chatwoot_message", AsyncMock(return_value=True)):
                process_webhook_automation(event.id)
                
    # Consulta o banco novamente usando uma sessão limpa para checar o status e resposta do evento
    new_db = TestingSessionLocal()
    try:
        updated_event = new_db.query(WebhookEventModel).filter(WebhookEventModel.id == 2).first()
        assert updated_event.status == "completed"
        assert "Lamento muito pelo ocorrido. Vou transferir seu atendimento" in updated_event.agent_response
    finally:
        new_db.close()
    
    # Verifica se sync_conversation_labels foi chamado para buscar e depois para adicionar a tag de ignore (humano)
    mock_sync.assert_any_call("https://chatwoot.example.com", 1, 123, "cw_token_123")
    mock_sync.assert_any_call("https://chatwoot.example.com", 1, 123, "cw_token_123", to_add=["humano"])
