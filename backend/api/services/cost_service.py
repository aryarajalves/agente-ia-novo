"""
api/services/cost_service.py

Centraliza o cálculo de custos das chamadas de IA,
reutilizando o catálogo de preços do config_store.
"""
from config_store import get_model_pricing, USD_TO_BRL


def calculate_ai_cost(model_name: str, input_tokens: int, output_tokens: int, cached_tokens: int = 0) -> tuple[float, float]:
    """
    Calcula o custo de uma chamada de IA em USD e BRL, aplicando desconto de cache.
    
    Returns:
        (cost_usd, cost_brl)
    """
    pricing = get_model_pricing(model_name)
    if not pricing:
        return 0.0, 0.0
    
    input_price = pricing.get("input", 0)
    # Custo de cache costuma ser 50% mais barato (ou usa valor específico se houver)
    cache_price = pricing.get("input_cached", input_price * 0.5)
    
    normal_input_tokens = max(0, input_tokens - cached_tokens)
    
    cost_usd = (normal_input_tokens * input_price) + (cached_tokens * cache_price) + (output_tokens * pricing.get("output", 0))
    cost_brl = cost_usd * USD_TO_BRL
    return cost_usd, cost_brl
