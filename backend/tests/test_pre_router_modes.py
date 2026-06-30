import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from agent_core.logic.pre_router import run_pre_router_ai
from models import AgentConfigModel

@pytest.mark.asyncio
async def test_pre_router_greeting_mode_panel():
    main_agent = AgentConfigModel(
        id=1, 
        name="Main", 
        description="Principal", 
        router_simple_model="gpt-4o-mini",
        initial_message="Olá do Painel!",
        greeting_mode="panel"
    )
    
    # Com greeting_mode="panel", o atalho de saudação deve pular a chamada da IA (ou tratá-lo estaticamente)
    result = await run_pre_router_ai("Oi", [], main_agent, [])
    assert result["eh_saudacao"] is True
    assert result["resposta_direta"] == "Olá do Painel!"
    assert result["_model_used"] == "shortcut-logic"

@pytest.mark.asyncio
async def test_pre_router_greeting_mode_prompt():
    main_agent = AgentConfigModel(
        id=1, 
        name="Main", 
        description="Principal", 
        router_simple_model="gpt-4o-mini",
        initial_message="Olá do Painel!",
        greeting_mode="prompt",
        system_prompt="Você é um assistente super educado."
    )
    
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = '{"eh_saudacao": true, "eh_agradecimento": false, "eh_mensagem_automatica": false, "precisa_esclarecimento": false, "eh_anuncio": false, "resposta_direta": "Olá dinâmico da IA!", "resposta_esclarecimento": null, "id_agente_alvo": 1, "perguntas_extraidas": null, "data_extraida": null}'
    mock_response.usage = MagicMock(prompt_tokens=10, completion_tokens=5, total_tokens=15)

    with patch("os.getenv", return_value="fake-key"):
        with patch("openai.AsyncOpenAI") as mock_openai:
            mock_client = MagicMock()
            mock_openai.return_value = mock_client
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
            
            result = await run_pre_router_ai("Oi", [], main_agent, [])
            
            assert result["eh_saudacao"] is True
            assert result["resposta_direta"] == "Olá dinâmico da IA!"
            assert result["_model_used"] == "gpt-4o-mini"

@pytest.mark.asyncio
async def test_pre_router_ad_mode_panel():
    main_agent = AgentConfigModel(
        id=1, 
        name="Main", 
        description="Principal", 
        router_simple_model="gpt-4o-mini",
        initial_ignore_message='["Oferta Imperdível!"]',
        ad_mode="panel"
    )
    
    # No modo painel, a triagem programática deve capturar o anúncio e removê-lo
    result = await run_pre_router_ai("Oi, Oferta Imperdível!", [], main_agent, [])
    assert result["eh_anuncio"] is True
    assert result["eh_saudacao"] is True
    assert "anúncio" in result["detalhe_anuncio"]

def test_get_date_context_relative_days():
    from agent_core.logic.pre_router import get_date_context
    main_agent = AgentConfigModel(id=1, name="Main")
    context = get_date_context(main_agent)
    
    assert "7 Dias Anteriores" in context
    assert "7 Dias Posteriores" in context
    assert "Hoje é" in context
    assert "Ontem foi" in context
    assert "Amanhã é" in context

def test_get_date_context_relative_days_custom():
    from agent_core.logic.pre_router import get_date_context
    main_agent = AgentConfigModel(
        id=1, 
        name="Main",
        date_awareness_past_days=3,
        date_awareness_future_days=10
    )
    context = get_date_context(main_agent)
    
    assert "3 Dias Anteriores" in context
    assert "10 Dias Posteriores" in context
    assert "Hoje é" in context
    
    # Verify that the past days loop ran 3 times (e.g. yesterday, day before, etc.)
    # and future loop ran 10 times.
    # We can check specific day headers if we want, but checking the title sections is already a great indicator.

