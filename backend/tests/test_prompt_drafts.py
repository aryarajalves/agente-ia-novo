import pytest
from httpx import AsyncClient
import os

# Pega o token de API do .env ou usa um padrão de teste
API_KEY = os.getenv("API_KEY", "a0c10372-af47-4a36-932a-9b1acdb59366")

@pytest.mark.asyncio
async def test_create_and_list_drafts():
    async with AsyncClient(base_url="http://localhost:8000") as ac:
        headers = {"X-API-Key": API_KEY}
        
        # 1. Cria um agente de teste
        agent_res = await ac.post("/agents", json={
            "name": "Agente de Teste Draft",
            "model": "gpt-4o-mini"
        }, headers=headers)
        assert agent_res.status_code == 200
        agent_id = agent_res.json()["id"]
        
        # 2. Cria um rascunho
        draft_res = await ac.post(f"/agents/{agent_id}/drafts", json={
            "prompt_text": "Este é um prompt de teste",
            "version_name": "Versão 1.0",
            "description": "Primeira versão de teste"
        }, headers=headers)
        assert draft_res.status_code == 200
        draft_data = draft_res.json()
        assert draft_data["version_name"] == "Versão 1.0"
        assert draft_data["description"] == "Primeira versão de teste"
        
        # 3. Lista os rascunhos
        list_res = await ac.get(f"/agents/{agent_id}/drafts", headers=headers)
        assert list_res.status_code == 200
        drafts = list_res.json()
        assert len(drafts) >= 1
        assert drafts[0]["version_name"] == "Versão 1.0"

@pytest.mark.asyncio
async def test_restore_draft():
    async with AsyncClient(base_url="http://localhost:8000") as ac:
        headers = {"X-API-Key": API_KEY}
        
        # 1. Cria agente
        agent_res = await ac.post("/agents", json={
            "name": "Agente Restore Test",
            "system_prompt": "Prompt Original"
        }, headers=headers)
        agent_id = agent_res.json()["id"]
        
        # 2. Cria rascunho
        draft_res = await ac.post(f"/agents/{agent_id}/drafts", json={
            "prompt_text": "Prompt Restaurado",
            "version_name": "Restauração"
        }, headers=headers)
        draft_id = draft_res.json()["id"]
        
        # 3. Restaura
        restore_res = await ac.post(f"/agents/{agent_id}/drafts/{draft_id}/restore", headers=headers)
        assert restore_res.status_code == 200
        
        # 4. Verifica se o agente foi atualizado
        get_res = await ac.get(f"/agents/{agent_id}", headers=headers)
        assert get_res.json()["system_prompt"] == "Prompt Restaurado"
