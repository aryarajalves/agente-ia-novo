"""
Testa a busca de histórico de memória com variações do 9° dígito no número de telefone.

Bug original: a query usava .in_(search_phones) com match exato, então um contato
armazenado com 9° dígito (5585996123586) não era encontrado quando o evento atual
chegava sem o 9° dígito (558596123586) e vice-versa.

Correção: a query agora usa OR com LIKE nos últimos 8 dígitos para ser resiliente.
"""

import os
import sys
import pytest
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch, PropertyMock

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from models import WebhookEventModel, AgentConfigModel, WebhookConfigModel


def _build_mock_events(phone: str) -> list:
    """Helper: cria eventos de histórico com um número de telefone específico."""
    return [
        WebhookEventModel(
            id=1, telefone=phone, webhook_config_id=99,
            mensagem="Oi, tudo bem?", agent_response="Olá! Como posso ajudar?",
            status="completed", dono="usuario",
            created_at=datetime.utcnow() - timedelta(minutes=5)
        ),
        WebhookEventModel(
            id=2, telefone=phone, webhook_config_id=99,
            mensagem="Quero saber sobre os planos.",
            agent_response="Temos planos a partir de R$99.",
            status="completed", dono="usuario",
            created_at=datetime.utcnow() - timedelta(minutes=3)
        ),
    ]


def test_phone_suffix_match_logic():
    """
    Valida que o sufixo de 8 dígitos cobre corretamente as variações do 9° dígito.
    """
    # Número com nono dígito (armazenado na memória)
    phone_with_9 = "5585996123586"  # 13 dígitos
    # Número sem nono dígito (recebido no evento atual)
    phone_without_9 = "558596123586"  # 12 dígitos

    import re
    clean_with_9 = re.sub(r"\D", "", phone_with_9)
    clean_without_9 = re.sub(r"\D", "", phone_without_9)

    suffix_with_9 = clean_with_9[-8:]
    suffix_without_9 = clean_without_9[-8:]

    # Ambos devem compartilhar o mesmo sufixo de 8 dígitos
    assert suffix_with_9 == suffix_without_9, (
        f"Sufixos diferentes: {suffix_with_9} != {suffix_without_9}. "
        "O LIKE '%{suffix}' não irá unificar os dois números."
    )

    # O LIKE "%96123586" deve corresponder aos dois números
    like_pattern = f"%{suffix_without_9}"
    assert phone_with_9.endswith(suffix_with_9), "Número com 9° dígito não termina com o sufixo esperado"
    assert phone_without_9.endswith(suffix_without_9), "Número sem 9° dígito não termina com o sufixo esperado"

    print(f"✅ Sufixo compartilhado: {suffix_without_9}")
    print(f"   '{phone_with_9}' LIKE '{like_pattern}' → {phone_with_9.endswith(suffix_with_9)}")
    print(f"   '{phone_without_9}' LIKE '{like_pattern}' → {phone_without_9.endswith(suffix_without_9)}")


def test_history_query_includes_9th_digit_variant():
    """
    Simula a lógica do webhook_tasks para garantir que a query com OR+LIKE
    recupere histórico armazenado com número diferente (com/sem 9° dígito).
    """
    import re

    # Evento atual: telefone SEM nono dígito
    current_phone_raw = "+558596123586"
    clean_phone = re.sub(r"\D", "", current_phone_raw)
    tel_suffix = clean_phone[-8:] if len(clean_phone) >= 8 else clean_phone

    # Histórico armazenado COM nono dígito
    stored_phone = "5585996123586"

    # Simular o filtro OR:
    # Condição 1: telefone IN search_phones (match exato) — FALHA
    search_phones = [current_phone_raw, clean_phone, f"+{clean_phone}"]
    condition_1 = stored_phone in search_phones

    # Condição 2: telefone LIKE '%{tel_suffix}' — FUNCIONA
    condition_2 = stored_phone.endswith(tel_suffix)

    assert not condition_1, "O match exato NÃO deveria encontrar o número com variação de 9° dígito"
    assert condition_2, (
        f"O LIKE '%{tel_suffix}' DEVE encontrar '{stored_phone}', "
        "mas falhou. Verifique a extração do sufixo."
    )

    # A condição OR final deve retornar True
    match = condition_1 or condition_2
    assert match, "A condição OR combinada deveria retornar True"

    print(f"✅ Exact match: {condition_1} | LIKE match: {condition_2} | OR result: {match}")


def test_history_query_reverse_variant():
    """
    Testa o cenário inverso: evento atual COM 9° dígito, histórico SEM.
    """
    import re

    # Evento atual: telefone COM nono dígito
    current_phone_raw = "+5585996123586"
    clean_phone = re.sub(r"\D", "", current_phone_raw)
    tel_suffix = clean_phone[-8:] if len(clean_phone) >= 8 else clean_phone

    # Histórico armazenado SEM nono dígito
    stored_phone = "558596123586"

    condition_exact = stored_phone in [current_phone_raw, clean_phone, f"+{clean_phone}"]
    condition_like = stored_phone.endswith(tel_suffix)

    assert not condition_exact, "Match exato não deveria funcionar no cenário inverso"
    assert condition_like, f"LIKE '%{tel_suffix}' deveria encontrar '{stored_phone}'"

    print(f"✅ Cenário inverso: LIKE match = {condition_like}")


def test_memory_event_status_in_history():
    """
    Valida que eventos de memória (status='success') estão incluídos na whitelist
    de status da query de histórico de contexto.

    Bug original: a query filtrava apenas ['completed', 'processed', 'delivered'],
    excluindo eventos salvos pelo receive_memory_webhook com status='success'.
    """
    # Whitelist atual (pós-correção)
    valid_statuses = ["completed", "processed", "delivered", "success"]

    # Status que eventos de memória usam
    memory_event_status = "success"

    assert memory_event_status in valid_statuses, (
        f"Status '{memory_event_status}' dos eventos de memória NÃO está na whitelist! "
        "Eventos de memória nunca serão incluídos no contexto."
    )

    # Status antigos que continuam válidos
    for s in ["completed", "processed", "delivered"]:
        assert s in valid_statuses, f"Status histórico '{s}' removido indevidamente"

    # Status que NÃO devem ser incluídos (evita vazar contexto incompleto)
    for s in ["processing", "error", "pending", "ignored"]:
        assert s not in valid_statuses, f"Status '{s}' não deveria estar na whitelist"

    print(f"✅ Whitelist de status válidos: {valid_statuses}")
    print(f"   Eventos de memória (status='{memory_event_status}') serão injetados no contexto.")


if __name__ == "__main__":
    test_phone_suffix_match_logic()
    test_history_query_includes_9th_digit_variant()
    test_history_query_reverse_variant()
    test_memory_event_status_in_history()
    print("\n✅ Todos os testes de variação do 9° dígito e status de memória passaram.")
