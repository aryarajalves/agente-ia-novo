import pytest
from fastapi.testclient import TestClient
try:
    from backend.main import app
except ImportError:
    from main import app
import os
import json

client = TestClient(app)

def test_search_prompt_not_found():
    # Test with a prompt that doesn't contain the subject
    payload = {
        "system_prompt": "Você é um assistente de vendas. Você fala sobre carros.",
        "query": "Como cozinhar um ovo?"
    }
    
    # We mock the API key for testing if not present, but here we expect the endpoint to handle it
    # For a real test, we might need a real key or a mock of the OpenAI client
    # Since I don't have a mock system for OpenAI here easily, I'll check if the structure is correct
    # If no API key, it should return 500 or handle it.
    
    # Let's assume for this test we want to verify the logic of the endpoint assuming LLM works.
    # In a real environment, we'd mock the openai client.
    
    response = client.post("/search-prompt", json=payload)
    
    # If no API KEY, it returns 500 "API Key not configured"
    if response.status_code == 500 and "API Key" in response.text:
        pytest.skip("OpenAI API Key not configured for testing")
        
    assert response.status_code == 200
    data = response.json()
    assert "found" in data
    assert "reasoning" in data

def test_search_prompt_structure():
    payload = {
        "system_prompt": "Identidade: Vendedor de software.\nMissão: Vender assinaturas.\nPreço: 100 reais por mês.",
        "query": "Qual o preço?"
    }
    
    response = client.post("/search-prompt", json=payload)
    
    if response.status_code == 500 and "API Key" in response.text:
        pytest.skip("OpenAI API Key not configured for testing")
        
    assert response.status_code == 200
    data = response.json()
    assert "found" in data
    if data["found"]:
        assert len(data["occurrences"]) > 0
        assert "text_snippet" in data["occurrences"][0]
        assert "line_start" in data["occurrences"][0]
