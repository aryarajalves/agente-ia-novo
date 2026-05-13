"""
Testes unitários para api/services/auth_service.py

Valida criação de tokens JWT, hashing de senha e
utilitários de mascaramento de dados sensíveis.
"""
import pytest
from datetime import timedelta, datetime, timezone
from unittest.mock import patch
from jose import jwt

from api.services.auth_service import (
    verify_password,
    get_password_hash,
    create_access_token,
    mask_sensitive_data,
    SECRET_KEY,
    ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)


class TestPasswordHashing:
    def test_hash_different_from_plain(self):
        hashed = get_password_hash("minha_senha")
        assert hashed != "minha_senha"

    def test_verify_correct_password(self):
        hashed = get_password_hash("senha123")
        assert verify_password("senha123", hashed) is True

    def test_reject_wrong_password(self):
        hashed = get_password_hash("senha123")
        assert verify_password("outrasenha", hashed) is False

    def test_hash_format_bcrypt(self):
        hashed = get_password_hash("qualquer")
        assert hashed.startswith("$2b$") or hashed.startswith("$2a$")

    def test_same_password_produces_different_hashes(self):
        h1 = get_password_hash("senha")
        h2 = get_password_hash("senha")
        # bcrypt gera salt diferente a cada vez
        assert h1 != h2


class TestJWTTokenCreation:
    def test_token_created_successfully(self):
        token = create_access_token(data={"sub": "user@test.com"})
        assert isinstance(token, str)
        assert len(token) > 0

    def test_token_contains_sub(self):
        token = create_access_token(data={"sub": "user@test.com"})
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert payload["sub"] == "user@test.com"

    def test_token_has_expiration(self):
        token = create_access_token(data={"sub": "user@test.com"})
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert "exp" in payload

    def test_custom_expiration_delta(self):
        delta = timedelta(minutes=5)
        before = datetime.now(timezone.utc)
        token = create_access_token(data={"sub": "u@test.com"}, expires_delta=delta)
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        after = datetime.now(timezone.utc)
        # expiração deve ser ~5min a partir de agora
        assert (exp - before).total_seconds() <= 300 + 2
        assert (exp - after).total_seconds() >= 298

    def test_default_expiration_is_24_hours(self):
        token = create_access_token(data={"sub": "u@test.com"})
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        now = datetime.now(timezone.utc)
        diff_minutes = (exp - now).total_seconds() / 60
        # Deve ser próximo de 1440 minutos (24h)
        assert 1430 <= diff_minutes <= 1441

    def test_extra_data_preserved_in_token(self):
        token = create_access_token(data={"sub": "u@test.com", "role": "admin"})
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert payload.get("role") == "admin"


class TestMaskSensitiveData:
    def test_mask_email(self):
        result = mask_sensitive_data("usuario@dominio.com")
        assert "***" in result
        assert "@dominio.com" in result
        assert result.startswith("us")

    def test_mask_short_string(self):
        result = mask_sensitive_data("ab")
        assert result == "***"

    def test_mask_regular_string(self):
        result = mask_sensitive_data("telefone123")
        assert result.startswith("te")
        assert "***" in result

    def test_empty_string_returns_as_is(self):
        result = mask_sensitive_data("")
        assert result == ""

    def test_none_returns_none(self):
        result = mask_sensitive_data(None)
        assert result is None


class TestConstants:
    def test_algorithm_is_hs256(self):
        assert ALGORITHM == "HS256"

    def test_expire_minutes_is_24h(self):
        assert ACCESS_TOKEN_EXPIRE_MINUTES == 60 * 24

    def test_secret_key_not_empty(self):
        assert len(SECRET_KEY) > 0
