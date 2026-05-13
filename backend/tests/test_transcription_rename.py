import pytest
from httpx import AsyncClient
from models import TranscriptionTaskModel
from sqlalchemy import select, delete

@pytest.mark.asyncio
async def test_rename_transcription_task(client: AsyncClient, db_session):
    # 1. Limpar e criar tarefa de teste
    await db_session.execute(delete(TranscriptionTaskModel))
    
    task = TranscriptionTaskModel(filename="original_name.mp4", status="SUCCESS")
    db_session.add(task)
    await db_session.commit()
    await db_session.refresh(task)
    
    task_id = task.id
    new_name = "renamed_file.mp4"
    
    # 2. Chamar endpoint de rename
    response = await client.patch(
        f"/transcription-tasks/{task_id}",
        json={"filename": new_name}
    )
    
    assert response.status_code == 200
    assert response.json()["filename"] == new_name
    
    # 3. Verificar no banco
    result = await db_session.execute(select(TranscriptionTaskModel).where(TranscriptionTaskModel.id == task_id))
    updated_task = result.scalar_one()
    assert updated_task.filename == new_name

@pytest.mark.asyncio
async def test_rename_transcription_not_found(client: AsyncClient, db_session):
    response = await client.patch(
        "/transcription-tasks/99999",
        json={"filename": "new_name.mp4"}
    )
    assert response.status_code == 404
    assert "não encontrada" in response.json()["detail"].lower()

@pytest.mark.asyncio
async def test_rename_transcription_empty_name(client: AsyncClient, db_session):
    # Criar uma tarefa para testar
    task = TranscriptionTaskModel(filename="test.mp4", status="SUCCESS")
    db_session.add(task)
    await db_session.commit()
    await db_session.refresh(task)

    response = await client.patch(
        f"/transcription-tasks/{task.id}",
        json={"filename": ""}
    )
    assert response.status_code == 400
    assert "não pode estar vazio" in response.json()["detail"].lower()

@pytest.mark.asyncio
async def test_get_transcription_task(client: AsyncClient, db_session):
    # Criar uma tarefa
    task = TranscriptionTaskModel(filename="detail_test.mp4", status="SUCCESS", result_text="Detailed text")
    db_session.add(task)
    await db_session.commit()
    await db_session.refresh(task)

    response = await client.get(f"/transcription-tasks/{task.id}")
    assert response.status_code == 200
    assert response.json()["filename"] == "detail_test.mp4"
    assert response.json()["result_text"] == "Detailed text"
