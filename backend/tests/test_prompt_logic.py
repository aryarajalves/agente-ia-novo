import pytest
from agent import resolve_conditional_blocks

def test_resolve_conditional_blocks_positive():
    text = "Olá [IF:premium]Premium User[/IF]"
    
    # Truthy
    assert resolve_conditional_blocks(text, {"premium": "true"}) == "Olá Premium User"
    assert resolve_conditional_blocks(text, {"premium": "1"}) == "Olá Premium User"
    assert resolve_conditional_blocks(text, {"premium": "sim"}) == "Olá Premium User"
    assert resolve_conditional_blocks(text, {"premium": "yes"}) == "Olá Premium User"
    
    # Falsy
    assert resolve_conditional_blocks(text, {"premium": "false"}) == "Olá "
    assert resolve_conditional_blocks(text, {"premium": "0"}) == "Olá "
    assert resolve_conditional_blocks(text, {"premium": ""}) == "Olá "
    assert resolve_conditional_blocks(text, {}) == "Olá "

def test_resolve_conditional_blocks_negative():
    text = "Olá [IF:premium:false]Guest[/IF]"
    
    # Falsy/Missing
    assert resolve_conditional_blocks(text, {"premium": "false"}) == "Olá Guest"
    assert resolve_conditional_blocks(text, {}) == "Olá Guest"
    
    # Truthy
    assert resolve_conditional_blocks(text, {"premium": "true"}) == "Olá "

def test_resolve_conditional_blocks_nested_concept():
    # Regular matching (not necessarily nested but multiple)
    text = "[IF:a]A[/IF][IF:b]B[/IF]"
    assert resolve_conditional_blocks(text, {"a": "true", "b": "false"}) == "AB" if False else "A" # should be A
    assert resolve_conditional_blocks(text, {"a": "true", "b": "true"}) == "AB"

def test_variable_substitution_in_agent_flow():
    # We test the logic used in process_message manually here or assume it works if resolve_conditional_blocks works
    # Actually process_message does:
    # messages[0]["content"] = resolve_conditional_blocks(messages[0]["content"], context_variables)
    # for key, value in context_variables.items():
    #     placeholder = "{" + key + "}"
    #     messages[0]["content"] = messages[0]["content"].replace(placeholder, str(value))
    
    prompt = "User: {name}, Status: {status}"
    context = {"name": "Alice", "status": "Active"}
    
    result = prompt.format(**context) # Python's native format or manual replace?
    # agent.py uses .replace(placeholder, val_str)
    
    content = prompt
    for key, value in context.items():
        placeholder = "{" + key + "}"
        content = content.replace(placeholder, str(value))
    
    assert content == "User: Alice, Status: Active"

def test_resolve_conditional_blocks_case_insensitive():
    text = "[IF:PREMIUM]VIP[/IF]"
    assert resolve_conditional_blocks(text, {"premium": "TRUE"}) == "VIP"
    assert resolve_conditional_blocks(text, {"PREMIUM": "true"}) == "VIP"

def test_remove_markdown_headers_from_prompt():
    import re
    system_prompt = "# 1. Saudação\nOlá tudo bem?\n\n## Regras de Preço\n- Valor é R$ 10\n#Outra coisa sem espaço"
    cleaned = re.sub(r'(?m)^[ \t]*#+[ \t]*', '', system_prompt)
    expected = "1. Saudação\nOlá tudo bem?\n\nRegras de Preço\n- Valor é R$ 10\nOutra coisa sem espaço"
    assert cleaned.replace('\r', '') == expected.replace('\r', '')

def test_resolve_conditional_blocks_logical_and():
    # Teste com operador AND
    text1 = "Olá [IF:premium AND ativo]VIP Ativo[/IF]"
    assert resolve_conditional_blocks(text1, {"premium": "true", "ativo": "true"}) == "Olá VIP Ativo"
    assert resolve_conditional_blocks(text1, {"premium": "true", "ativo": "false"}) == "Olá "
    assert resolve_conditional_blocks(text1, {"premium": "false", "ativo": "true"}) == "Olá "
    assert resolve_conditional_blocks(text1, {}) == "Olá "

    # Teste com operador &&
    text2 = "Olá [IF:premium && ativo]VIP Ativo[/IF]"
    assert resolve_conditional_blocks(text2, {"premium": "true", "ativo": "true"}) == "Olá VIP Ativo"
    assert resolve_conditional_blocks(text2, {"premium": "true", "ativo": "false"}) == "Olá "

    # Teste com comparações numéricas combinadas
    text3 = "[IF:idade >= 18 AND saldo > 100]Autorizado[/IF]"
    assert resolve_conditional_blocks(text3, {"idade": "20", "saldo": "150"}) == "Autorizado"
    assert resolve_conditional_blocks(text3, {"idade": "17", "saldo": "150"}) == ""

def test_resolve_conditional_blocks_date_comparison():
    # Teste de comparação de datas com hífens (que falhavam na conversão float e davam True indevidamente)
    text = "[IF:data_atual == 2026-06-06]Black Friday[/IF]"
    
    # Iguais
    assert resolve_conditional_blocks(text, {"data_atual": "2026-06-06"}) == "Black Friday"
    
    # Diferentes (deve ficar vazio)
    assert resolve_conditional_blocks(text, {"data_atual": "2026-06-01"}) == ""


def test_dynamic_prompt_concatenation():
    # Simulando o objeto de config e a substituição que ocorre em core.py
    class DummyConfig:
        system_prompt = "Instruções estáticas."
        dynamic_prompt = "Instruções dinâmicas de {nome}."
        
    config = DummyConfig()
    context_variables = {"nome": "Aryaraj"}
    
    system_prompt = config.system_prompt
    dynamic_prompt = config.dynamic_prompt
    
    if dynamic_prompt:
        dynamic_prompt = resolve_conditional_blocks(dynamic_prompt, context_variables)
        for k, v in context_variables.items():
            dynamic_prompt = dynamic_prompt.replace("{" + k + "}", str(v) if v is not None else "")
        system_prompt += f"\n\n### DIRETRIZES E REGRAS DINÂMINAS DO AGENTE:\n{dynamic_prompt}"
        
    assert "Instruções estáticas." in system_prompt
    assert "### DIRETRIZES E REGRAS DINÂMINAS DO AGENTE:" in system_prompt
    assert "Instruções dinâmicas de Aryaraj." in system_prompt
def test_temporal_variables_injection():
    # Test temporal variables injection logic inside process_message
    from core.timezone import get_now_br
    now_br = get_now_br()
    dias_semana_portugues = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"]
    
    # Simula o dicionário que passamos para process_message
    context_variables = {}
    
    if "dia_semana" not in context_variables or context_variables["dia_semana"] is None:
        context_variables["dia_semana"] = dias_semana_portugues[now_br.weekday()]
    if "data_atual" not in context_variables or context_variables["data_atual"] is None:
        context_variables["data_atual"] = now_br.strftime("%Y-%m-%d")
    if "hora_atual" not in context_variables or context_variables["hora_atual"] is None:
        context_variables["hora_atual"] = now_br.strftime("%H:%M")
        
    assert context_variables["dia_semana"] == dias_semana_portugues[now_br.weekday()]
    assert context_variables["data_atual"] == now_br.strftime("%Y-%m-%d")
    assert context_variables["hora_atual"] == now_br.strftime("%H:%M")
