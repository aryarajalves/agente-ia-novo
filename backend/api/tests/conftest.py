"""
Configurações e fixtures globais para os testes da api modular.
"""
import os
import sys
import pytest

# Garante que o backend esteja no path quando os testes forem executados
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Variáveis de ambiente para testes (evita conectar a serviços reais)
os.environ.setdefault("TESTING", "true")
os.environ.setdefault("JWT_SECRET_KEY", "test_secret_key_for_unit_tests_only")
os.environ.setdefault("AGENT_API_KEY", "")  # Sem API Key obrigatória em testes
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("OPENAI_API_KEY", "test-key")
os.environ.setdefault("S3_ENDPOINT_URL", "")
os.environ.setdefault("S3_ACCESS_KEY", "")
os.environ.setdefault("S3_SECRET_KEY", "")
os.environ.setdefault("S3_BUCKET_NAME", "")
