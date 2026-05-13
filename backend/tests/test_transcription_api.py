import pytest
from httpx import AsyncClient
from models import TranscriptionTaskModel
from sqlalchemy import select

@pytest.mark.asyncio
async def test_list_transcription_tasks_pagination(client: AsyncClient, db_session):
    # 1. Limpar tarefas existentes
    from sqlalchemy import delete
    await db_session.execute(delete(TranscriptionTaskModel))
    await db_session.commit()
    
    # 2. Criar múltiplas tarefas para testar a paginação
    # Criamos 25 tarefas para testar o limite padrão de 20
    tasks_to_create = []
    for i in range(25):
        task = TranscriptionTaskModel(
            filename=f"video_{i:02d}.mp4",
            s3_key=f"s3://bucket/video_{i:02d}.mp4",
            status="SUCCESS",
            result_text=f"Transcrição do vídeo {i}"
        )
        tasks_to_create.append(task)
        db_session.add(task)
    
    await db_session.commit()

    # 3. Testar primeira página (padrão)
    response = await client.get("/transcription-tasks")
    assert response.status_code == 200
    data = response.json()
    
    assert "tasks" in data
    assert "total" in data
    assert "page" in data
    assert "limit" in data
    
    assert data["total"] == 25
    assert len(data["tasks"]) == 20 # Limite padrão
    assert data["page"] == 1
    assert data["limit"] == 20

    # 4. Testar segunda página
    response = await client.get("/transcription-tasks?page=2")
    assert response.status_code == 200
    data = response.json()
    
    assert len(data["tasks"]) == 5 # Restante das 25 tarefas
    assert data["page"] == 2

    # 5. Testar limite customizado (50)
    response = await client.get("/transcription-tasks?limit=50")
    assert response.status_code == 200
    data = response.json()
    
    assert len(data["tasks"]) == 25 # Todas as tarefas cabem em uma página de 50
    assert data["limit"] == 50

    # 6. Testar limite customizado (10)
    response = await client.get("/transcription-tasks?limit=10&page=3")
    assert response.status_code == 200
    data = response.json()
    
    assert len(data["tasks"]) == 5 # 10 + 10 + 5
    assert data["page"] == 3
    assert data["limit"] == 10

@pytest.mark.asyncio
async def test_list_transcription_tasks_empty(client: AsyncClient, db_session):
    # Garante que não há tarefas
    from sqlalchemy import delete
    await db_session.execute(delete(TranscriptionTaskModel))
    await db_session.commit()
    
    response = await client.get("/transcription-tasks")
    assert response.status_code == 200
    data = response.json()
    
    assert data["total"] == 0
    assert len(data["tasks"]) == 0
