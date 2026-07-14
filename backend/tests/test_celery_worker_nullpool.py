"""
test_celery_worker_nullpool.py
===========================================================================
Testa que o async_session_worker usa NullPool (sem pool de conexoes),
evitando o bug critico onde a Pergunta 1 do RAG multi-pergunta falhava
silenciosamente no Celery ForkPoolWorker com o erro:
  "Task got Future attached to a different loop"
"""
import os
import pytest

os.environ.setdefault("TESTING", "true")


def test_async_session_worker_uses_nullpool():
    """Garante que engine_worker usa NullPool."""
    from sqlalchemy.pool import NullPool
    from database.connection import engine_worker

    pool_class = type(engine_worker.pool)
    assert pool_class.__name__ == "NullPool", (
        f"engine_worker deveria usar NullPool mas usa {pool_class.__name__}."
    )


def test_async_session_and_worker_are_different_factories():
    """Garante que async_session (FastAPI) e async_session_worker (Celery) sao factories distintas."""
    from database.connection import async_session, async_session_worker, engine, engine_worker

    assert async_session is not async_session_worker
    assert engine is not engine_worker


def test_engine_fastapi_does_not_use_nullpool():
    """Garante que o engine do FastAPI ainda usa pool de conexoes normal."""
    from sqlalchemy.pool import NullPool
    from database.connection import engine

    pool_class = type(engine.pool)
    assert pool_class.__name__ != "NullPool", (
        "engine do FastAPI nao deveria usar NullPool."
    )


def test_webhook_tasks_imports_worker_session():
    """Verifica que webhook_tasks importa async_session_worker e NAO async_session."""
    import ast
    import pathlib

    tasks_path = pathlib.Path(__file__).parent.parent / "webhook_tasks.py"
    source = tasks_path.read_text(encoding="utf-8")

    tree = ast.parse(source)
    imported_names = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom):
            if node.module == "database":
                for alias in node.names:
                    imported_names.add(alias.name)

    assert "async_session_worker" in imported_names, (
        "webhook_tasks.py deveria importar 'async_session_worker' de 'database'."
    )
    assert "async_session" not in imported_names, (
        "webhook_tasks.py NAO deveria importar 'async_session' (sem _worker)."
    )


def test_webhook_tasks_uses_worker_session_in_run():
    """Verifica que webhook_tasks usa async_session_worker() na funcao _run()."""
    import pathlib

    tasks_path = pathlib.Path(__file__).parent.parent / "webhook_tasks.py"
    source = tasks_path.read_text(encoding="utf-8")

    assert "async with async_session_worker() as async_db:" in source, (
        "webhook_tasks.py deveria abrir a sessao com 'async_session_worker()'."
    )
    assert "async with async_session() as async_db:" not in source, (
        "webhook_tasks.py ainda usa 'async_session()' (sem o sufixo _worker)."
    )


@pytest.mark.asyncio
async def test_evaluate_rag_relevance_returns_tuple_when_empty():
    """Garante que evaluate_rag_relevance retorna tupla mesmo com lista vazia."""
    from services.rag.agentic import evaluate_rag_relevance

    result = await evaluate_rag_relevance("qual e o preco?", [])

    assert isinstance(result, tuple)
    assert len(result) >= 2
    relevant = result[0]
    assert relevant == []
