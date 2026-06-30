import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_status_page_root(client: AsyncClient):
    response = await client.get("/")
    assert response.status_code == 200
    assert "Backend do Projeto: AgenteFlow" in response.text
    assert "Sistema Ativo" in response.text
    assert "SISTEMA OPERACIONAL" in response.text
