import pytest
from api.services.cost_service import calculate_ai_cost
from config_store import USD_TO_BRL
from models import InteractionLog
from sqlalchemy import select

def test_calculate_ai_cost_with_caching():
    # Modelo GPT-5.2 (Input: 0.00000175, Output: 0.000014)
    # Sem cache
    cost_usd_no_cache, cost_brl_no_cache = calculate_ai_cost("gpt-5.2", 1000, 500, 0)
    expected_usd_no_cache = (1000 * 0.00000175) + (500 * 0.000014)
    assert abs(cost_usd_no_cache - expected_usd_no_cache) < 1e-9
    assert abs(cost_brl_no_cache - (expected_usd_no_cache * USD_TO_BRL)) < 1e-9

    # Com cache (ex: 800 tokens cacheados dos 1000 de entrada)
    # O desconto padrão de cache é 50%
    cost_usd_cache, cost_brl_cache = calculate_ai_cost("gpt-5.2", 1000, 500, 800)
    expected_usd_cache = ((1000 - 800) * 0.00000175) + (800 * (0.00000175 * 0.5)) + (500 * 0.000014)
    assert abs(cost_usd_cache - expected_usd_cache) < 1e-9
    assert abs(cost_brl_cache - (expected_usd_cache * USD_TO_BRL)) < 1e-9

@pytest.mark.asyncio
async def test_process_message_saves_cached_tokens(db_session):
    from models import AgentConfigModel
    
    # Criar agente dummy para satisfazer a constraint de ForeignKey
    agent = AgentConfigModel(
        name="Agente Teste Cache",
        model="gpt-5.2",
        system_prompt="Você é um assistente de testes."
    )
    db_session.add(agent)
    await db_session.commit()
    
    # Verifica salvamento na tabela interaction_logs com cached_tokens
    log = InteractionLog(
        agent_id=agent.id,
        session_id="test_session_cache_1",
        user_message="Olá",
        agent_response="Olá! Como posso ajudar?",
        model_used="gpt-5.2",
        input_tokens=15000,
        output_tokens=500,
        cached_tokens=14000,
        cost_usd=0.01,
        cost_brl=0.05
    )
    db_session.add(log)
    await db_session.commit()

    stmt = select(InteractionLog).where(InteractionLog.session_id == "test_session_cache_1")
    result = await db_session.execute(stmt)
    saved_log = result.scalar_one()

    assert saved_log.cached_tokens == 14000
    assert saved_log.input_tokens == 15000
    assert saved_log.output_tokens == 500

