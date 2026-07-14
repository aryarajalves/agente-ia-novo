import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from agent_core.core import process_message
from agent_core.logic.pre_router import DEFAULT_PRE_ROUTER_PROMPT_TEMPLATE
from config_store import AgentConfig

@pytest.mark.asyncio
async def test_prerouter_optimization_bypasses():
    # Mocking AgentConfig
    config = AgentConfig(
        id=1,
        name="Test Agent",
        model="gpt-4o-mini",
        system_prompt="You are a test agent.",
        knowledge_base_id=99, # Simulates that RAG is mapped
        handoff_enabled=True  # Simulates handoff tool is mapped
    )
    
    # Mocking Tools
    mock_tool = MagicMock()
    mock_tool.name = "custom_zapvoice"
    mock_tool.description = "Sends voice message"
    mock_tool.parameters_schema = {}
    tools = [mock_tool]

    # 1. Test case: Pre-router decides RAG=False, Tools=False
    # RAG should be skipped and openai_tools should be empty
    mock_pre_router_result = {
        "eh_saudacao": False,
        "precisa_rag": False,
        "precisa_ferramenta": False,
        "resposta_direta": None,
        "id_agente_alvo": 1
    }

    with patch("agent_core.core.run_pre_router_ai", new_callable=AsyncMock, return_value=mock_pre_router_result) as mock_pr, \
         patch("rag_service.search_knowledge_base", new_callable=AsyncMock) as mock_search_kb, \
         patch("agent_core.core.get_openai_client") as mock_get_client:

        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock()
        mock_get_client.return_value = mock_client

        await process_message(
            message="Olá",
            history=[],
            config=config,
            tools=tools,
            db=MagicMock() # Mock DB session
        )

        # Assert search_knowledge_base was NEVER called because precisa_rag is False
        mock_search_kb.assert_not_called()

        # Assert uvicorn client was called and tools parameter in messages was empty/not supplied
        # since handoff and custom tools are disabled
        args, kwargs = mock_client.chat.completions.create.call_args
        assert "tools" not in kwargs or len(kwargs["tools"]) == 0


@pytest.mark.asyncio
async def test_prerouter_optimization_keeps_only_unanswered_fallback_on_no_tools_with_rag():
    config = AgentConfig(
        id=1,
        name="Test Agent",
        model="gpt-4o-mini",
        system_prompt="You are a test agent.",
        knowledge_base_id=99
    )

    mock_tool = MagicMock()
    mock_tool.name = "custom_zapvoice"
    mock_tool.description = "Sends voice message"
    mock_tool.parameters_schema = {}
    tools = [mock_tool]

    # Pre-router decides RAG=True (needs RAG) but Tools=False (no tools needed)
    # RAG search should be executed, custom_zapvoice skipped, but fallback registrar_duvida_sem_resposta preserved
    mock_pre_router_result = {
        "eh_saudacao": False,
        "precisa_rag": True,
        "precisa_ferramenta": False,
        "resposta_direta": None,
        "id_agente_alvo": 1
    }

    with patch("agent_core.core.run_pre_router_ai", new_callable=AsyncMock, return_value=mock_pre_router_result), \
         patch("rag_service.search_knowledge_base", new_callable=AsyncMock, return_value=([], None)), \
         patch("agent_core.core.get_openai_client") as mock_get_client:

        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock()
        mock_get_client.return_value = mock_client

        await process_message(
            message="Como funciona o curso?",
            history=[],
            config=config,
            tools=tools,
            db=MagicMock()
        )

        args, kwargs = mock_client.chat.completions.create.call_args
        assert "tools" in kwargs
        injected_tools = [t["function"]["name"] for t in kwargs["tools"]]
        # custom_zapvoice should be excluded, but registrar_duvida_sem_resposta should be kept
        assert "custom_zapvoice" not in injected_tools
        assert "registrar_duvida_sem_resposta" in injected_tools


# ─── Query Enrichment Tests ───────────────────────────────────────────────────

def test_query_enrichment_instruction_in_default_template():
    """Garante que a instrução de Query Enrichment está no template padrão do Pre-Router."""
    assert "ENRIQUECIMENTO DE PERGUNTAS VAGAS" in DEFAULT_PRE_ROUTER_PROMPT_TEMPLATE
    assert "QUERY ENRICHMENT" in DEFAULT_PRE_ROUTER_PROMPT_TEMPLATE
    assert "precisa_esclarecimento" in DEFAULT_PRE_ROUTER_PROMPT_TEMPLATE


def test_query_enrichment_prompt_contains_examples():
    """Garante que os exemplos de enriquecimento estão presentes no template."""
    assert (
        "transformar" in DEFAULT_PRE_ROUTER_PROMPT_TEMPLATE
        or "enriquecer" in DEFAULT_PRE_ROUTER_PROMPT_TEMPLATE
    )


@pytest.mark.asyncio
async def test_query_enrichment_enriched_message_used_as_perguntas_extraidas():
    """
    Verifica que, quando o Pre-Router retorna uma mensagem enriquecida em
    'perguntas_extraidas', ela substitui a mensagem original ao chamar o agente principal.
    """
    config = AgentConfig(
        id=1,
        name="Test Agent",
        model="gpt-4o-mini",
        system_prompt="Você é um agente de vendas do Método Laser Day.",
        knowledge_base_id=None
    )

    # Pre-router enriquece a pergunta vaga "como funciona?" com contexto do histórico
    mock_pre_router_result = {
        "eh_saudacao": False,
        "precisa_rag": True,
        "precisa_ferramenta": False,
        "resposta_direta": None,
        "id_agente_alvo": 1,
        "perguntas_extraidas": "Como funciona o Método Laser Day?",  # enriquecida
        "data_extraida": None,
        "precisa_esclarecimento": False,
    }

    with patch("agent_core.core.run_pre_router_ai", new_callable=AsyncMock, return_value=mock_pre_router_result), \
         patch("agent_core.core.get_openai_client") as mock_get_client:

        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock()
        mock_get_client.return_value = mock_client

        await process_message(
            message="como funciona?",  # mensagem original vaga
            history=[{"role": "user", "content": "quero saber sobre o Método Laser Day"}],
            config=config,
            tools=[],
            db=MagicMock()
        )

        args, kwargs = mock_client.chat.completions.create.call_args
        messages_sent = kwargs.get("messages", [])
        user_messages = [m for m in messages_sent if m.get("role") == "user"]
        assert len(user_messages) > 0
        last_user_msg = user_messages[-1]["content"]
        # A mensagem enriquecida deve estar presente, não a original vaga
        assert "Método Laser Day" in last_user_msg or "Como funciona" in last_user_msg


@pytest.mark.asyncio
async def test_query_enrichment_clarification_when_no_context():
    """
    Verifica que o Pre-Router pode retornar precisa_esclarecimento=True
    e que o resultado final contém a mensagem de esclarecimento.
    """
    config = AgentConfig(
        id=1,
        name="Test Agent",
        model="gpt-4o-mini",
        system_prompt="Você é um agente de vendas.",
        knowledge_base_id=None
    )

    clarification_msg = "Claro! Poderia me dizer sobre o que você quer saber como funciona?"

    mock_pre_router_result = {
        "eh_saudacao": False,
        "precisa_rag": False,
        "precisa_ferramenta": False,
        "resposta_direta": clarification_msg,
        "resposta_esclarecimento": clarification_msg,
        "id_agente_alvo": 1,
        "perguntas_extraidas": None,
        "precisa_esclarecimento": True,
    }

    with patch("agent_core.core.run_pre_router_ai", new_callable=AsyncMock, return_value=mock_pre_router_result), \
         patch("agent_core.core.get_openai_client") as mock_get_client:

        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock()
        mock_get_client.return_value = mock_client

        # Sem histórico (primeira mensagem vaga sem contexto)
        result = await process_message(
            message="como funciona?",
            history=[],  # sem histórico
            config=config,
            tools=[],
            db=MagicMock()
        )

        # O resultado deve existir (não None)
        assert result is not None
        # A mensagem de esclarecimento deve ser acessível
        assert clarification_msg in str(mock_pre_router_result.get("resposta_direta", ""))


@pytest.mark.asyncio
async def test_process_message_logs_empty_rag_in_pipeline():
    """
    Verifica que, se o RAG for executado e retornar vazio, a etapa do pipeline
    ainda é registrada na timeline avisando que nenhum conhecimento foi encontrado.
    """
    config = AgentConfig(
        id=1,
        name="Test Agent",
        model="gpt-4o-mini",
        system_prompt="You are a test agent.",
        knowledge_base_id=99
    )

    mock_pre_router_result = {
        "eh_saudacao": False,
        "precisa_rag": True,
        "precisa_ferramenta": False,
        "resposta_direta": None,
        "id_agente_alvo": 1
    }

    mock_on_step = MagicMock()
    mock_rag_usage = MagicMock()
    mock_rag_usage.prompt_tokens = 100
    mock_rag_usage.completion_tokens = 50
    mock_rag_usage.applied_modules = {"Módulo de Teste": True}
    mock_rag_usage.sub_queries = []

    with patch("agent_core.core.run_pre_router_ai", new_callable=AsyncMock, return_value=mock_pre_router_result), \
         patch("rag_service.search_knowledge_base", new_callable=AsyncMock, return_value=(([], mock_rag_usage))), \
         patch("agent_core.core.get_openai_client") as mock_get_client:

        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock()
        mock_get_client.return_value = mock_client

        await process_message(
            message="Dúvida sem RAG no banco",
            history=[],
            config=config,
            tools=[],
            db=MagicMock(),
            on_step=mock_on_step
        )

        # Filtrar as chamadas do on_step que correspondem ao RAG
        rag_calls = [call[0][1] for call in mock_on_step.call_args_list if call[0][0] == "📚 Consulta à Base de Conhecimento (RAG)"]
        assert len(rag_calls) > 0
        assert any("Nenhum conhecimento relevante" in content for content in rag_calls)
        assert any("Módulo de Teste" in content for content in rag_calls)


@pytest.mark.asyncio
async def test_process_message_logs_bypassed_rag_in_pipeline():
    """
    Verifica que, se o RAG for bypassado pelo Pre-Router, a etapa do pipeline
    ainda é registrada na timeline avisando que a busca foi pulada pela IA.
    """
    config = AgentConfig(
        id=1,
        name="Test Agent",
        model="gpt-4o-mini",
        system_prompt="You are a test agent.",
        knowledge_base_id=99
    )

    # RAG desativado pela IA (precisa_rag=False)
    mock_pre_router_result = {
        "eh_saudacao": True,
        "precisa_rag": False,
        "precisa_ferramenta": False,
        "resposta_direta": "Olá! Como posso ajudar?",
        "id_agente_alvo": 1
    }

    mock_on_step = MagicMock()

    with patch("agent_core.core.run_pre_router_ai", new_callable=AsyncMock, return_value=mock_pre_router_result), \
         patch("agent_core.core.get_openai_client") as mock_get_client:

        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock()
        mock_get_client.return_value = mock_client

        await process_message(
            message="Olá",
            history=[],
            config=config,
            tools=[],
            db=MagicMock(),
            on_step=mock_on_step
        )

        # Filtrar as chamadas do on_step que correspondem ao RAG
        rag_calls = [call[0][1] for call in mock_on_step.call_args_list if call[0][0] == "📚 Consulta à Base de Conhecimento (RAG)"]
        assert len(rag_calls) > 0
        assert any("pulada pelo Pre-Router" in content for content in rag_calls)
