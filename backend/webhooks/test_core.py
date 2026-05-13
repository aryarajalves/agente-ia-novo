import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from webhooks.utils import normalize_phone, get_phone_suffix, sanitize_table_name, get_value_by_path

# Mocks para evitar conexões de banco no import
with patch("database.engine", MagicMock()):
    from webhooks.service import ensure_leads_table, upsert_lead

def test_normalize_phone():
    assert normalize_phone("+55 (85) 99999-9999") == "5585999999999"
    assert normalize_phone("85 9999-9999") == "8599999999"
    assert normalize_phone(None) == ""

def test_get_phone_suffix():
    assert get_phone_suffix("5585988887777") == "88887777"
    assert get_phone_suffix("988887777") == "88887777"

def test_sanitize_table_name():
    assert sanitize_table_name("leads_2024") == "leads_2024"
    assert sanitize_table_name("Leads-Table!") == "leads_table"

def test_get_value_by_path():
    data = {"user": {"profile": {"name": "Aryar"}}}
    assert get_value_by_path(data, "user.profile.name") == "Aryar"
    assert get_value_by_path(data, "user.id") is None

@pytest.mark.asyncio
async def test_ensure_leads_table():
    mock_engine = MagicMock()
    mock_conn = AsyncMock()
    mock_engine.begin.return_value.__aenter__.return_value = mock_conn
    
    with patch("webhooks.service.engine", mock_engine):
        await ensure_leads_table("test_table")
        assert mock_conn.execute.called
