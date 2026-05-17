import pytest
import os
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_get_users_me_admin(client: AsyncClient):
    # Login as admin
    admin_email = os.getenv("ADMIN_EMAIL", "aryarajmarketing@gmail.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "123456")
    api_key = os.getenv("AGENT_API_KEY")
    
    login_res = await client.post("/login", json={"email": admin_email, "password": admin_password})
    token = login_res.json()["token"]
    
    headers = {
        "Authorization": f"Bearer {token}",
        "X-API-Key": api_key
    }
    
    response = await client.get("/users/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == admin_email
    assert data["role"] == "Super Admin"

@pytest.mark.asyncio
async def test_update_users_me_name(client: AsyncClient):
    # Login as admin
    admin_email = os.getenv("ADMIN_EMAIL", "aryarajmarketing@gmail.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "123456")
    api_key = os.getenv("AGENT_API_KEY")
    
    login_res = await client.post("/login", json={"email": admin_email, "password": admin_password})
    token = login_res.json()["token"]
    
    headers = {
        "Authorization": f"Bearer {token}",
        "X-API-Key": api_key
    }
    
    # Update name
    new_name = "Super Admin Updated"
    response = await client.put("/users/me", json={"name": new_name}, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == new_name
    assert data["email"] == admin_email # Email shouldn't change

@pytest.mark.asyncio
async def test_update_users_me_restrict_admin_email(client: AsyncClient):
    # Login as admin
    admin_email = os.getenv("ADMIN_EMAIL", "aryarajmarketing@gmail.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "123456")
    api_key = os.getenv("AGENT_API_KEY")
    
    login_res = await client.post("/login", json={"email": admin_email, "password": admin_password})
    token = login_res.json()["token"]
    
    headers = {
        "Authorization": f"Bearer {token}",
        "X-API-Key": api_key
    }
    
    # Try to update email (should be ignored by the logic I implemented)
    response = await client.put("/users/me", json={"email": "hacker@example.com"}, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == admin_email # Remains original

@pytest.mark.asyncio
async def test_update_users_me_whitelabel(client: AsyncClient):
    # Login as admin
    admin_email = os.getenv("ADMIN_EMAIL", "aryarajmarketing@gmail.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "123456")
    api_key = os.getenv("AGENT_API_KEY")
    
    login_res = await client.post("/login", json={"email": admin_email, "password": admin_password})
    token = login_res.json()["token"]
    
    headers = {
        "Authorization": f"Bearer {token}",
        "X-API-Key": api_key
    }
    
    # Valida GET inicial
    get_res = await client.get("/users/me", headers=headers)
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert "company_name" in get_data
    assert "company_logo" in get_data
    assert "company_logo_size" in get_data
    
    # Atualiza as configurações de White-label
    whitelabel_data = {
        "company_name": "Antigravity Corp",
        "company_logo": "https://antigravity.ai/logo.png",
        "company_logo_size": "large"
    }
    
    put_res = await client.put("/users/me", json=whitelabel_data, headers=headers)
    assert put_res.status_code == 200
    put_data = put_res.json()
    assert put_data["company_name"] == "Antigravity Corp"
    assert put_data["company_logo"] == "https://antigravity.ai/logo.png"
    assert put_data["company_logo_size"] == "large"
    
    # Valida GET subsequente para atestar persistência no DB
    get_res2 = await client.get("/users/me", headers=headers)
    assert get_res2.status_code == 200
    get_data2 = get_res2.json()
    assert get_data2["company_name"] == "Antigravity Corp"
    assert get_data2["company_logo"] == "https://antigravity.ai/logo.png"
    assert get_data2["company_logo_size"] == "large"
