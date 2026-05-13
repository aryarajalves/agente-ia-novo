import pytest
from unittest.mock import MagicMock, patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
import os

# Ajustar path para importar do backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from models import Base, WebhookConfigModel, WebhookEventModel, AgentConfigModel
from webhook_tasks import process_webhook_automation

# Configuração do banco de testes SQLite em memória
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(name="db")
def fixture_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

def test_pipeline_text_message(db):
    # Setup
    agent = AgentConfigModel(id=1, name="Test Agent")
    db.add(agent)
    db.commit()
    
    config = WebhookConfigModel(id=1, name="Test Config", token="token_text", agent_id=1)
    db.add(config)
    db.commit()
    
    event = WebhookEventModel(id=1, webhook_config_id=1, message_type="text", mensagem="Oi", status="received")
    db.add(event)
    db.commit()

    with patch("webhook_tasks.SessionLocal", return_value=db):
        with patch("webhook_tasks._add_step") as mock_add_step:
            with patch("webhook_tasks._build_agent_config"):
                with patch("webhook_tasks.asyncio.run"): # Mock agent execution
                    # Celery task bound (bind=True) injeta 'self' automaticamente
                    process_webhook_automation(event.id)
    
    # Verifica se chamou o log de texto
    mock_add_step.assert_any_call(db, event.id, "📝 Mensagem de texto", "Tipo de mensagem identificado como texto. Continuando pipeline...")

def test_pipeline_video_message(db):
    # Setup
    config = WebhookConfigModel(id=2, name="Test Config Video", token="token_video", agent_id=1)
    db.add(config)
    db.commit()
    
    event = WebhookEventModel(id=2, webhook_config_id=2, message_type="video", status="received")
    db.add(event)
    db.commit()

    with patch("webhook_tasks.SessionLocal", return_value=db):
        with patch("webhook_tasks._add_step") as mock_add_step:
            process_webhook_automation(event.id)
    
    # Verifica retorno precoce e status
    db.refresh(event)
    assert event.status == "completed"
    mock_add_step.assert_any_call(db, event.id, "🚫 Mídia não suportada (video)", "Não foi possível enviar pro agente já que é um tipo mídia que não aceita.")

def test_pipeline_document_message(db):
    # Setup
    config = WebhookConfigModel(id=3, name="Test Config Doc", token="token_doc", agent_id=1)
    db.add(config)
    db.commit()
    
    event = WebhookEventModel(id=3, webhook_config_id=3, message_type="document", status="received")
    db.add(event)
    db.commit()

    with patch("webhook_tasks.SessionLocal", return_value=db):
        with patch("webhook_tasks._add_step") as mock_add_step:
            process_webhook_automation(event.id)
    
    db.refresh(event)
    assert event.status == "completed"
    mock_add_step.assert_any_call(db, event.id, "🚫 Mídia não suportada (document)", "Não foi possível enviar pro agente já que é um tipo mídia que não aceita.")

def test_pipeline_audio_permitted(db):
    # Setup
    config = WebhookConfigModel(id=4, name="Test Config Audio Ok", token="token_audio_ok", agent_id=1, process_audio=True)
    db.add(config)
    db.commit()
    
    event = WebhookEventModel(id=4, webhook_config_id=4, message_type="audio", status="received")
    db.add(event)
    db.commit()

    with patch("webhook_tasks.SessionLocal", return_value=db):
        with patch("webhook_tasks._add_step") as mock_add_step:
            process_webhook_automation(event.id)
    
    db.refresh(event)
    assert event.status == "completed"
    mock_add_step.assert_any_call(db, event.id, "🎙️ Áudio detectado", "A integração permite áudio. No futuro faremos a transcrição, mas por enquanto a automação para aqui.")

def test_pipeline_audio_disabled(db):
    # Setup
    config = WebhookConfigModel(id=5, name="Test Config Audio No", token="token_audio_no", agent_id=1, process_audio=False)
    db.add(config)
    db.commit()
    
    event = WebhookEventModel(id=5, webhook_config_id=5, message_type="audio", status="received")
    db.add(event)
    db.commit()

    with patch("webhook_tasks.SessionLocal", return_value=db):
        with patch("webhook_tasks._add_step") as mock_add_step:
            process_webhook_automation(event.id)
    
    db.refresh(event)
    assert event.status == "completed"
    mock_add_step.assert_any_call(db, event.id, "🚫 Áudio desativado", "O processamento de áudio está desativado nas configurações desta integração.")

def test_pipeline_image_permitted(db):
    # Setup
    config = WebhookConfigModel(id=6, name="Test Config Img Ok", token="token_img_ok", agent_id=1, process_image=True)
    db.add(config)
    db.commit()
    
    event = WebhookEventModel(id=6, webhook_config_id=6, message_type="image", status="received")
    db.add(event)
    db.commit()

    with patch("webhook_tasks.SessionLocal", return_value=db):
        with patch("webhook_tasks._add_step") as mock_add_step:
            process_webhook_automation(event.id)
    
    db.refresh(event)
    assert event.status == "completed"
    mock_add_step.assert_any_call(db, event.id, "🖼️ Imagem detectada", "A integração permite imagem. No futuro faremos a análise, mas por enquanto a automação para aqui.")
