import pytest

def check_rag_bypass(message):
    words = message.split()
    greetings = ["oi", "ola", "bom dia", "boa tarde", "boa noite", "obrigado", "valeu", "vlw", "ok", "tudo bem"]
    is_simple_greeting = len(words) <= 3 and any(x in message.lower() for x in greetings) and "?" not in message
    return is_simple_greeting

def test_rag_bypass_logic():
    # Pula RAG
    assert check_rag_bypass("Oi") == True
    assert check_rag_bypass("Ola bom dia") == True
    assert check_rag_bypass("Valeu!") == True
    
    # NAO pula RAG
    assert check_rag_bypass("Oi, qual o preco?") == False
    assert check_rag_bypass("Ola! Quero saber mais sobre o produto") == False
    assert check_rag_bypass("Como faco para me inscrever?") == False
    
    print("Test RAG bypass: PASS")

if __name__ == "__main__":
    test_rag_bypass_logic()
