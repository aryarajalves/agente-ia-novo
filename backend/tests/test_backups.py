import pytest
import os
from httpx import AsyncClient
from unittest.mock import patch, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession

@pytest.mark.asyncio
async def test_get_backup_config(client: AsyncClient):
    admin_email = os.getenv("ADMIN_EMAIL", "aryarajmarketing@gmail.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "123456")
    login_res = await client.post("/login", json={"email": admin_email, "password": admin_password})
    token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.get("/backups/config", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "enabled" in data
    assert "retention_count" in data

@pytest.mark.asyncio
async def test_update_backup_config(client: AsyncClient):
    admin_email = os.getenv("ADMIN_EMAIL", "aryarajmarketing@gmail.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "123456")
    login_res = await client.post("/login", json={"email": admin_email, "password": admin_password})
    token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "enabled": True,
        "frequency_type": "hours",
        "interval_value": 12,
        "retention_count": 15,
        "backup_folder": "MinhaPastaTeste"
    }
    response = await client.put("/backups/config", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["enabled"] is True
    assert data["interval_value"] == 12
    assert data["retention_count"] == 15
    assert data["backup_folder"] == "MinhaPastaTeste"

@pytest.mark.asyncio
async def test_get_backup_history(client: AsyncClient):
    admin_email = os.getenv("ADMIN_EMAIL", "aryarajmarketing@gmail.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "123456")
    login_res = await client.post("/login", json={"email": admin_email, "password": admin_password})
    token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.get("/backups/history", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_run_manual_backup_flow(client: AsyncClient):
    admin_email = os.getenv("ADMIN_EMAIL", "aryarajmarketing@gmail.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "123456")
    login_res = await client.post("/login", json={"email": admin_email, "password": admin_password})
    token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    with patch("tasks.trigger_manual_backup.delay") as mock_delay:
        response = await client.post("/backups/run", headers=headers)
        assert response.status_code == 200
        assert response.json()["status"] == "success"
        mock_delay.assert_called_once()

@pytest.mark.asyncio
async def test_backup_unauthorized(client: AsyncClient):
    # Test accessing backup config without token
    response = await client.get("/backups/config")
    assert response.status_code == 403 or response.status_code == 401

@pytest.mark.asyncio
async def test_restore_backup_not_found(client: AsyncClient):
    admin_email = os.getenv("ADMIN_EMAIL", "aryarajmarketing@gmail.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "123456")
    login_res = await client.post("/login", json={"email": admin_email, "password": admin_password})
    token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.post("/backups/history/999999/restore", headers=headers)
    assert response.status_code == 500  # Falha na restauração pois id não existe

@pytest.mark.asyncio
async def test_backup_pinning_limit_and_ordering(client: AsyncClient, db_session: AsyncSession):
    admin_email = os.getenv("ADMIN_EMAIL", "aryarajmarketing@gmail.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "123456")
    login_res = await client.post("/login", json={"email": admin_email, "password": admin_password})
    token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    from models import BackupHistoryModel
    from datetime import datetime, timezone, timedelta
    
    b1 = BackupHistoryModel(filename="backup_one", s3_key="key1", status="success", is_pinned=False, created_at=datetime.now(timezone.utc) - timedelta(minutes=10))
    b2 = BackupHistoryModel(filename="backup_two", s3_key="key2", status="success", is_pinned=False, created_at=datetime.now(timezone.utc) - timedelta(minutes=8))
    b3 = BackupHistoryModel(filename="backup_three", s3_key="key3", status="success", is_pinned=False, created_at=datetime.now(timezone.utc) - timedelta(minutes=6))
    b4 = BackupHistoryModel(filename="backup_four", s3_key="key4", status="success", is_pinned=False, created_at=datetime.now(timezone.utc) - timedelta(minutes=4))
    
    db_session.add_all([b1, b2, b3, b4])
    await db_session.commit()
    
    with patch("s3_service.s3_service.s3_client.list_objects_v2") as mock_list:
        mock_list.return_value = {"Contents": []}
        
        res = await client.get("/backups/history", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 4
        assert data[0]["filename"] == "backup_four"
        assert data[1]["filename"] == "backup_three"
        assert data[2]["filename"] == "backup_two"
        assert data[3]["filename"] == "backup_one"

        for item in [b1, b2, b3]:
            pin_res = await client.post(f"/backups/history/{item.id}/pin", headers=headers)
            assert pin_res.status_code == 200
            assert pin_res.json()["is_pinned"] is True

        pin_fail_res = await client.post(f"/backups/history/{b4.id}/pin", headers=headers)
        assert pin_fail_res.status_code == 400
        assert "Limite de 3 backups fixados atingido" in pin_fail_res.json()["detail"]

        res_ordered = await client.get("/backups/history", headers=headers)
        assert res_ordered.status_code == 200
        data_ordered = res_ordered.json()
        assert data_ordered[0]["filename"] == "backup_three"
        assert data_ordered[1]["filename"] == "backup_two"
        assert data_ordered[2]["filename"] == "backup_one"
        assert data_ordered[3]["filename"] == "backup_four"

        # 7. Tentar excluir um backup fixado (ex: b1) - Deve retornar erro 400
        delete_fail_res = await client.delete(f"/backups/history/{b1.id}", headers=headers)
        assert delete_fail_res.status_code == 400
        assert "Não é possível excluir um backup fixado" in delete_fail_res.json()["detail"]

        # 8. Desfixar b1, e então excluir - Deve funcionar com sucesso (retornar 200)
        unpin_res = await client.post(f"/backups/history/{b1.id}/pin", headers=headers)
        assert unpin_res.status_code == 200
        assert unpin_res.json()["is_pinned"] is False
        
        delete_success_res = await client.delete(f"/backups/history/{b1.id}", headers=headers)
        assert delete_success_res.status_code == 200
        assert delete_success_res.json()["success"] is True

@pytest.mark.asyncio
async def test_delete_batch_backups(client: AsyncClient, db_session: AsyncSession):
    admin_email = os.getenv("ADMIN_EMAIL", "aryarajmarketing@gmail.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "123456")
    login_res = await client.post("/login", json={"email": admin_email, "password": admin_password})
    token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    from models import BackupHistoryModel
    from datetime import datetime, timezone

    b_unpinned1 = BackupHistoryModel(filename="batch_unpinned_1", s3_key="batch_key_1", status="success", is_pinned=False, created_at=datetime.now(timezone.utc))
    b_unpinned2 = BackupHistoryModel(filename="batch_unpinned_2", s3_key="batch_key_2", status="success", is_pinned=False, created_at=datetime.now(timezone.utc))
    b_pinned = BackupHistoryModel(filename="batch_pinned", s3_key="batch_pinned_key", status="success", is_pinned=True, created_at=datetime.now(timezone.utc))

    db_session.add_all([b_unpinned1, b_unpinned2, b_pinned])
    await db_session.commit()

    # 1. Tentar deletar em lote incluindo o fixado - Deve falhar 400
    payload_fail = {"ids": [b_unpinned1.id, b_unpinned2.id, b_pinned.id]}
    res_fail = await client.post("/backups/delete-batch", json=payload_fail, headers=headers)
    assert res_fail.status_code == 400
    assert "Não é possível excluir backups fixados" in res_fail.json()["detail"]

    # 2. Deletar em lote apenas os livres - Deve funcionar 200
    payload_success = {"ids": [b_unpinned1.id, b_unpinned2.id]}
    res_success = await client.post("/backups/delete-batch", json=payload_success, headers=headers)
    assert res_success.status_code == 200
    assert res_success.json()["success"] is True
    assert "2 backups excluídos" in res_success.json()["message"]



