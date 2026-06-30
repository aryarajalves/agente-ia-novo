import os
import sys
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Adicionar o diretório pai ao sys.path para importar os módulos do backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from models import GlobalContextVariableModel, UserMemoryModel
from agent_core.memory import update_user_memory
from agent_core.core import process_message

@pytest.mark.asyncio
async def test_global_context_variable_schema():
    # Valida que as novas propriedades existem na classe do modelo
    var = GlobalContextVariableModel(
        key="teste_extraido",
        value="padrão",
        extraction_method="ai",
        extraction_prompt="Extraia x do diálogo"
    )
    assert var.extraction_method == "ai"
    assert var.extraction_prompt == "Extraia x do diálogo"

@pytest.mark.asyncio
@patch("agent_core.memory.get_openai_client")
async def test_update_user_memory_with_ai_extraction(mock_get_client):
    from unittest.mock import MagicMock, patch, AsyncMock
    # Mock do DB com spec=AsyncSession
    db = AsyncMock(spec=AsyncSession)
    
    # Mock do retorno da query de variáveis globais
    var_ia = GlobalContextVariableModel(
        key="nicho_mercado",
        type="string",
        extraction_method="ai",
        extraction_prompt="Identifique o nicho de mercado do cliente"
    )
    
    # Simular resultado de select(GlobalContextVariableModel)
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = [var_ia]
    
    mock_result_vars = MagicMock()
    mock_result_vars.scalars.return_value = mock_scalars
    
    # Simular que a variável não existe na memória ainda
    mock_scalars_mem = MagicMock()
    mock_scalars_mem.first.return_value = None
    
    mock_result_mem = MagicMock()
    mock_result_mem.scalars.return_value = mock_scalars_mem
    
    calls = []
    def db_execute_mock(stmt):
        calls.append(stmt)
        if len(calls) == 1:
            return mock_result_vars
        return mock_result_mem
    db.execute.side_effect = db_execute_mock

    
    # Mock do retorno da chamada da LLM
    mock_choice = MagicMock()
    mock_choice.message.content = '{"nicho_mercado": "Infoprodutos e IA", "fatos_gerais": ["gosta de tecnologia"]}'
    
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
    mock_get_client.return_value = mock_client
    
    # Executar update_user_memory
    await update_user_memory(db, "session_test_123", "Oi, eu vendo infoprodutos", "Entendi, legal.")
    
    # Verificar se as informações foram inseridas
    assert db.add.called
    added_obj = db.add.call_args[0][0]
    assert isinstance(added_obj, UserMemoryModel)
    assert added_obj.session_id == "session_test_123"
    assert added_obj.key == "nicho_mercado"
    assert added_obj.value == "Infoprodutos e IA"

@pytest.mark.asyncio
@patch("agent_core.core.get_openai_client")
async def test_process_message_injects_extracted_variables(mock_get_client):
    from unittest.mock import MagicMock, patch, AsyncMock
    db = AsyncMock(spec=AsyncSession)


    
    # Mock das variáveis configuradas no banco
    var_ia = GlobalContextVariableModel(
        key="nicho_mercado",
        value="Geral",
        type="string",
        extraction_method="ai"
    )
    
    # Simula o valor da memória recuperado para o contato
    memoria_salva = UserMemoryModel(
        session_id="session_test_123",
        key="nicho_mercado",
        value="Infoprodutos e IA"
    )
    
    # Mocks para queries no core.py
    mock_scalars_vars = MagicMock()
    mock_scalars_vars.all.return_value = [var_ia]
    mock_res_vars = MagicMock()
    mock_res_vars.scalars.return_value = mock_scalars_vars
    
    mock_scalars_mem = MagicMock()
    mock_scalars_mem.all.return_value = [memoria_salva]
    mock_res_mem = MagicMock()
    mock_res_mem.scalars.return_value = mock_scalars_mem
    
    db.execute.side_effect = [mock_res_vars, mock_res_mem]
    
    # Configurar mock de agent config
    config = MagicMock()
    config.model = "gpt-4o-mini"
    config.system_prompt = "Olá, sei que seu nicho é {nicho_mercado}."
    config.dynamic_prompt = ""
    config.initial_question_message = None
    config.question_mode = "panel"
    config.context_window = 5
    config.router_enabled = False

    
    # Mock do client OpenAI para o process_message em si
    mock_choice = MagicMock()
    mock_choice.message.content = "Resposta do assistente"
    mock_choice.message.tool_calls = []
    
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
    mock_get_client.return_value = mock_client
    
    ctx = {"session_id": "session_test_123"}
    
    await process_message(
        message="Olá",
        history=[],
        config=config,
        context_variables=ctx,
        db=db
    )
    
    # Validar que o nicho_mercado no context_variables foi preenchido com o valor da memória ("Infoprodutos e IA")
    # em vez do valor padrão "Geral"
    assert ctx["nicho_mercado"] == "Infoprodutos e IA"
