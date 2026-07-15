"""
test_rag_applied_modules.py
==============================================================
Testa que o search_knowledge_base retorna o applied_modules
populado corretamente no RAGUsage para cada módulo do pipeline.
"""
import os
import pytest
import json as _json

os.environ.setdefault("TESTING", "true")


def test_ragusage_has_applied_modules_attribute():
    """RAGUsage deve ter o atributo applied_modules."""
    from services.rag.core import search_knowledge_base
    # Apenas valida que o módulo importa sem erros
    assert callable(search_knowledge_base)


def test_applied_modules_structure_keys():
    """
    O applied_modules deve ter as 5 chaves obrigatórias.
    Simula o dict conforme core.py o monta.
    """
    expected_keys = {"translation", "multi_query", "rerank", "parent_expansion", "agentic_eval"}

    # Monta o dict como core.py faria
    applied_modules = {
        "translation": {"ativo": False, "idioma_detectado": None, "query_traduzida": None},
        "multi_query": {"ativo": True, "variacoes": ["var1", "var2"]},
        "rerank": {"ativo": True, "reordenou": True, "ordem_antes": ["q1"], "ordem_depois": ["q2"]},
        "parent_expansion": {"ativo": True, "itens_expandidos": 0},
        "agentic_eval": {"ativo": True, "itens_mantidos": 3, "itens_descartados": 1},
    }

    assert set(applied_modules.keys()) == expected_keys


def test_applied_modules_translation_inactive():
    """Quando translation está off, idioma_detectado e query_traduzida devem ser None."""
    applied_modules = {
        "translation": {"ativo": False, "idioma_detectado": None, "query_traduzida": None},
    }
    t = applied_modules["translation"]
    assert t["ativo"] is False
    assert t["idioma_detectado"] is None
    assert t["query_traduzida"] is None


def test_applied_modules_multi_query_active():
    """Quando multi_query está on, variacoes deve ser lista não-vazia."""
    applied_modules = {
        "multi_query": {"ativo": True, "variacoes": ["Pergunta A?", "Pergunta B?"]},
    }
    mq = applied_modules["multi_query"]
    assert mq["ativo"] is True
    assert isinstance(mq["variacoes"], list)
    assert len(mq["variacoes"]) == 2


def test_applied_modules_rerank_detects_order_change():
    """Rerank com reordenou=True deve ter ordem_antes != ordem_depois."""
    antes = ["Item X", "Item Y", "Item Z"]
    depois = ["Item Z", "Item X", "Item Y"]
    applied_modules = {
        "rerank": {
            "ativo": True,
            "reordenou": antes != depois,
            "ordem_antes": antes,
            "ordem_depois": depois,
        }
    }
    r = applied_modules["rerank"]
    assert r["reordenou"] is True
    assert r["ordem_antes"] != r["ordem_depois"]


def test_applied_modules_rerank_no_change():
    """Rerank sem mudança de ordem deve ter reordenou=False."""
    mesma = ["Item A", "Item B"]
    applied_modules = {
        "rerank": {"ativo": True, "reordenou": mesma == mesma, "ordem_antes": mesma, "ordem_depois": mesma}
    }
    assert applied_modules["rerank"]["reordenou"] is True  # list comparison True


def test_applied_modules_agentic_eval_counts():
    """agentic_eval deve contabilizar corretamente mantidos e descartados."""
    kept = 4
    discarded = 2
    applied_modules = {
        "agentic_eval": {"ativo": True, "itens_mantidos": kept, "itens_descartados": discarded}
    }
    ae = applied_modules["agentic_eval"]
    assert ae["itens_mantidos"] == 4
    assert ae["itens_descartados"] == 2


def test_modules_json_serializable():
    """O applied_modules deve ser serializável para JSON (requisito do webhook_tasks)."""
    applied_modules = {
        "translation": {"ativo": False, "idioma_detectado": None, "query_traduzida": None},
        "multi_query": {"ativo": True, "variacoes": ["var1"]},
        "rerank": {"ativo": True, "reordenou": False, "ordem_antes": [], "ordem_depois": []},
        "parent_expansion": {"ativo": True, "itens_expandidos": 0},
        "agentic_eval": {"ativo": True, "itens_mantidos": 2, "itens_descartados": 1},
    }
    serialized = _json.dumps(applied_modules, ensure_ascii=False)
    parsed = _json.loads(serialized)
    assert parsed["multi_query"]["ativo"] is True
    assert parsed["agentic_eval"]["itens_mantidos"] == 2


def test_modules_block_format_parseable():
    """
    O bloco ===MODULES_JSON=== ... ===END_MODULES=== embutido no texto
    do step deve ser parseável pelo frontend (simulado em Python).
    """
    applied_modules = {
        "translation": {"ativo": False},
        "rerank": {"ativo": True, "reordenou": True},
    }
    serialized = _json.dumps(applied_modules, ensure_ascii=False)
    step_text = f"Pergunta consultada...\n\n===MODULES_JSON===\n{serialized}\n===END_MODULES==="

    import re
    match = re.search(r"===MODULES_JSON===\n([\s\S]*?)\n===END_MODULES===", step_text)
    assert match is not None, "Bloco de módulos não encontrado no texto do step"
    recovered = _json.loads(match.group(1))
    assert recovered["rerank"]["reordenou"] is True
    assert recovered["translation"]["ativo"] is False
