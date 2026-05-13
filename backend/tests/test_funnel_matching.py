import pytest

# Mock database models
class MockFunnel:
    def __init__(self, id, client_id, trigger_phrase, name, is_active=True):
        self.id = id
        self.client_id = client_id
        self.trigger_phrase = trigger_phrase
        self.name = name
        self.is_active = is_active

def test_funnel_matching_logic():
    """
    Testa match de funil com ASCII para evitar erros de encoding.
    """
    client_id = 1
    
    funnels = [
        MockFunnel(1, client_id, "ola", "Funil Boas Vindas"),
        MockFunnel(2, client_id, "preco,valor,quanto custa", "Funil Preco"),
        MockFunnel(3, client_id, "comprar , inscricao", "Funil Compra")
    ]
    
    def mock_query_filter(user_input):
        user_input_clean = user_input.strip().lower()
        for f in funnels:
            if f.client_id != client_id: continue
            tp_lower = f.trigger_phrase.lower()
            
            cond1 = tp_lower == user_input_clean
            cond2 = f",{user_input_clean}," in f",{tp_lower}," or \
                    tp_lower.startswith(f"{user_input_clean},") or \
                    tp_lower.endswith(f",{user_input_clean}") or \
                    f", {user_input_clean}," in f", {tp_lower} ," or \
                    f", {user_input_clean}" in f", {tp_lower}"
            
            if cond1 or cond2:
                return f
        return None

    # Caso 1: Match exato (case-insensitive)
    assert mock_query_filter("Ola").id == 1
    assert mock_query_filter("OLA").id == 1
    
    # Caso 2: Match em lista
    assert mock_query_filter("preco").id == 2
    assert mock_query_filter("quanto custa").id == 2
    
    # Caso 3: Match com espacos
    assert mock_query_filter("inscricao").id == 3
    assert mock_query_filter("comprar").id == 3
    
    print("Test funnel matching: PASS")

if __name__ == "__main__":
    test_funnel_matching_logic()
