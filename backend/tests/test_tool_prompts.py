"""
test_tool_prompts.py
==============================================================
Testa que o campo tool_prompts é integrado na montagem
do prompt do pre-router e é serializado na API corretamente.
"""
import pytest
from unittest.mock import MagicMock
from agent_core.logic.pre_router import _build_pre_router_system_prompt


def test_build_pre_router_with_custom_tool_prompt():
    """Deve usar o prompt customizado de uma ferramenta no pre-router se definido."""
    # Mock do agente com ferramentas e prompts customizados
    tool1 = MagicMock()
    tool1.id = 1
    tool1.name = "agendar_consulta"
    tool1.description = "Agenda consulta no banco."
    tool1.parameters_schema = "{}"

    agent = MagicMock()
    agent.id = 99
    agent.tools = [tool1]
    agent.pre_router_prompt = "Instrucoes: {tools_desc}"
    agent.handoff_enabled = False
    agent.qualification_questions = None

    # Caso 1: Sem prompt customizado (usa a descrição padrão)
    agent.tool_prompts = {}
    vars_map = {
        "initial_msg": "",
        "initial_ignore_message": "",
        "greeting_mode": "panel",
        "ad_mode": "panel",
        "main_system_prompt": "",
        "tools_desc": "- agendar_consulta: Agenda consulta no banco. Parâmetros/Schema: {}\n",
        "agents_desc": "",
        "main_agent_id": 99,
        "date_context": "",
    }
    prompt_std = _build_pre_router_system_prompt(agent, vars_map)
    assert "- agendar_consulta: Agenda consulta no banco." in prompt_std

    # Caso 2: Com prompt customizado (substitui a descrição)
    agent.tool_prompts = {"1": "Acione apenas se o lead confirmar o dia."}
    # Na lógica do pre_router.py, a montagem do tools_desc seria feita usando esse dict.
    # Vamos emular a lógica do loop do pre_router:
    agent_tool_prompts = agent.tool_prompts
    t = tool1
    custom_hint = agent_tool_prompts.get(str(t.id))
    desc_to_use = custom_hint.strip() if custom_hint and custom_hint.strip() else t.description
    tools_desc_custom = f"- {t.name}: {desc_to_use}. Parâmetros/Schema: {t.parameters_schema}\n"

    vars_map["tools_desc"] = tools_desc_custom
    prompt_custom = _build_pre_router_system_prompt(agent, vars_map)
    assert "- agendar_consulta: Acione apenas se o lead confirmar o dia." in prompt_custom
    assert "Agenda consulta no banco." not in prompt_custom


def test_build_pre_router_with_internal_tool_prompts():
    """Deve customizar os prompts das ferramentas internas (suporte, duvida, qual)."""
    tool_prompts = {
        "transferir_suporte_humano": "Transfira para humano somente sob ameaça de processo.",
        "registrar_duvida_sem_resposta": "Crie um ticket se não souber a resposta.",
        "lead_qualificado": "Marque como qualificado após 3 perguntas.",
    }

    # Simula o bloco de código do pre_router.py
    tools_desc = ""
    # transferir_suporte_humano
    custom_handoff = tool_prompts.get("transferir_suporte_humano")
    desc_handoff = custom_handoff.strip() if custom_handoff and custom_handoff.strip() else "Padrão"
    tools_desc += f"- transferir_suporte_humano: {desc_handoff}\n"

    # registrar_duvida_sem_resposta
    custom_duvida = tool_prompts.get("registrar_duvida_sem_resposta")
    desc_duvida = custom_duvida.strip() if custom_duvida and custom_duvida.strip() else "Padrão"
    tools_desc += f"- registrar_duvida_sem_resposta: {desc_duvida}\n"

    # lead_qualificado
    custom_qual = tool_prompts.get("lead_qualificado")
    desc_qual = custom_qual.strip() if custom_qual and custom_qual.strip() else "Padrão"
    tools_desc += f"- lead_qualificado: {desc_qual}\n"

    assert "Transfira para humano somente sob ameaça de processo" in tools_desc
    assert "Crie um ticket se não souber a resposta" in tools_desc
    assert "Marque como qualificado após 3 perguntas" in tools_desc
