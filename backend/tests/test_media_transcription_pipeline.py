import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
import os
import json

# Ajustar path para importar do backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from models import Base, WebhookConfigModel, WebhookEventModel
from webhook_tasks import process_media_content_task

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

def test_process_media_content_task_saves_model_in_pipeline(db):
    # Setup
    config = WebhookConfigModel(id=10, name="Test Config Media", token="token_media", agent_id=None)
    db.add(config)
    db.commit()
    
    event = WebhookEventModel(
        id=20, 
        webhook_config_id=10, 
        message_type="audio", 
        mensagem="[AUDIO PENDENTE]", 
        status="waiting",
        link="https://example.com/audio.mp3"
    )
    db.add(event)
    db.commit()
    
    # Mock do process_media_content para simular retorno de transcrição do Whisper
    mock_media_result = {
        "text": "Olá, esta é uma transcrição de teste.",
        "model": "whisper-1"
    }
    
    # Precisamos mockar o SessionLocal e a função process_media_content assíncrona
    with patch("webhook_tasks.SessionLocal", return_value=db):
        with patch("webhook_tasks.process_media_content", return_value=mock_media_result):
            process_media_content_task(10, 20)
            
    # Obter o evento do banco novamente para validar
    db.close() # Garante expiração e nova leitura
    db = TestingSessionLocal()
    updated_event = db.query(WebhookEventModel).filter(WebhookEventModel.id == 20).first()
    
    assert updated_event is not None
    assert updated_event.status == "media_ready"
    assert updated_event.mensagem == "Olá, esta é uma transcrição de teste."
    
    # Validar se as etapas da pipeline foram adicionadas e contêm a informação do modelo utilizado
    steps = json.loads(updated_event.processing_steps or "[]")
    assert len(steps) >= 2
    
    # O último passo deve ser a confirmação da extração
    last_step = steps[-1]
    assert last_step["step"] == "✅ Conteúdo Extraído"
    assert "Modelo de transcrição utilizado: whisper-1" in last_step["detail"]
    assert "Olá, esta é uma transcrição de teste." in last_step["detail"]
