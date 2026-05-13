"""
api/services/cost_service.py

Centraliza o cálculo de custos das chamadas de IA,
reutilizando o catálogo de preços do config_store.
"""
from config_store import get_model_pricing, USD_TO_BRL


def calculate_ai_cost(model_name: str, input_tokens: int, output_tokens: int) -> tuple[float, float]:
    """
    Calcula o custo de uma chamada de IA em USD e BRL.
    
    Returns:
        (cost_usd, cost_brl)
    """
    pricing = get_model_pricing(model_name)
    if not pricing:
        return 0.0, 0.0
    
    cost_usd = (input_tokens * pricing.get("input", 0)) + (output_tokens * pricing.get("output", 0))
    cost_brl = cost_usd * USD_TO_BRL
    return cost_usd, cost_brl
