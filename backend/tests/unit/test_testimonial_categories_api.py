import pytest
from httpx import AsyncClient
from models import TestimonialCategoryModel, TestimonialModel

@pytest.mark.asyncio
async def test_testimonial_categories_crud(client: AsyncClient, db_session):
    # 1. Garantir que inicia vazio na base de teste truncada
    response = await client.get("/testimonials/categories")
    assert response.status_code == 200
    assert len(response.json()) == 0

    # 2. Criar uma nova categoria
    response = await client.post("/testimonials/categories", json={"name": "Curso de Testes Automatizados"})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Curso de Testes Automatizados"
    assert data["value"] == "curso_de_testes_automatizados"
    cat_id = data["id"]

    # 3. Listar novamente e confirmar criação
    response = await client.get("/testimonials/categories")
    assert response.status_code == 200
    categories = response.json()
    assert len(categories) == 1
    assert categories[0]["id"] == cat_id
    assert categories[0]["name"] == "Curso de Testes Automatizados"
    assert categories[0]["value"] == "curso_de_testes_automatizados"

    # 4. Tentar criar categoria duplicada (deve retornar erro 400)
    response = await client.post("/testimonials/categories", json={"name": "Curso de Testes Automatizados"})
    assert response.status_code == 400

    # 5. Excluir a categoria cadastrada
    response = await client.delete(f"/testimonials/categories/{cat_id}")
    assert response.status_code == 200
    assert response.json()["message"] == "Categoria e depoimentos associados excluídos com sucesso."

    # 6. Confirmar que a lista voltou a ficar vazia
    response = await client.get("/testimonials/categories")
    assert response.status_code == 200
    assert len(response.json()) == 0
