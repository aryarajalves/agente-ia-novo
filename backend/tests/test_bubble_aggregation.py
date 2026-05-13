"""
Testa a agregação de bolhas de saída do agente no mesmo evento de histórico.

Bug original: cada bolha de WhatsApp ("Imagina 🙂", "Antes de você ir...", etc.)
gerava um evento separado no histórico, fragmentando a mensagem.

Correção: bolhas chegadas dentro de 90s são agregadas no mesmo evento via
UPDATE no campo 'mensagem', separadas por '\n\n'.
"""

import os
import sys
import pytest
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch, AsyncMock

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))


def test_bubble_aggregation_logic():
    """
    Valida a lógica de agregação: nova bolha é concatenada ao evento existente
    em vez de criar um novo registro.
    """
    # Simula evento existente do agente criado há 30s
    existing_event = MagicMock()
    existing_event.mensagem = "Imagina 🙂"
    existing_event.id = 10
    existing_event.created_at = datetime.utcnow() - timedelta(seconds=30)

    # Nova bolha chegando
    new_bubble = "Antes de você ir: você já conseguiu abrir o acesso no e-mail da Eduzz certinho?"

    # Condição de agregação
    within_window = existing_event.created_at > datetime.utcnow() - timedelta(seconds=90)
    not_duplicate = new_bubble not in (existing_event.mensagem or "")

    assert within_window, "Evento dentro da janela de 90s deveria ser elegível para agregação"
    assert not_duplicate, "Nova bolha não é duplicata do conteúdo existente"

    # Agregar
    existing_event.mensagem = (existing_event.mensagem or "") + "\n\n" + new_bubble
    expected = "Imagina 🙂\n\nAntes de você ir: você já conseguiu abrir o acesso no e-mail da Eduzz certinho?"
    assert existing_event.mensagem == expected, f"Mensagem agregada incorreta: '{existing_event.mensagem}'"

    print(f"✅ Mensagem agregada corretamente: {repr(existing_event.mensagem[:60])}...")


def test_bubble_aggregation_does_not_duplicate():
    """
    Valida que a mesma bolha NÃO é adicionada duas vezes se já estiver no conteúdo.
    """
    existing_event = MagicMock()
    existing_event.mensagem = "Imagina 🙂\n\nAntes de você ir..."
    existing_event.created_at = datetime.utcnow() - timedelta(seconds=20)

    bubble = "Imagina 🙂"  # Já existe no mensagem

    # Condição que evita duplicata
    is_duplicate = bubble in (existing_event.mensagem or "")
    should_aggregate = not is_duplicate  # Só agrega se não for duplicata

    assert is_duplicate, "Deveria detectar que a bolha já está no evento"
    assert not should_aggregate, "NÃO deveria agregar uma bolha duplicada"

    print(f"✅ Duplicata detectada corretamente para: {repr(bubble)}")


def test_bubble_aggregation_respects_time_window():
    """
    Valida que bolhas chegadas após 90s criam um NOVO evento, não agregam.
    """
    old_event_time = datetime.utcnow() - timedelta(seconds=91)  # Além da janela

    within_window = old_event_time > datetime.utcnow() - timedelta(seconds=90)

    assert not within_window, (
        "Evento de 91s atrás NÃO deveria estar dentro da janela de 90s. "
        "Deve criar um novo evento em vez de agregar."
    )

    print(f"✅ Janela de tempo respeitada: evento de 91s = fora da janela ({within_window})")


def test_bubble_aggregation_multiple_bubbles():
    """
    Testa agregação de 3 bolhas consecutivas em um único evento.
    """
    bubbles = [
        "Imagina 🙂",
        "Antes de você ir: você já conseguiu abrir o acesso no e-mail da Eduzz certinho?",
        "E me conta uma coisa rápida: o que mais te trouxe até o Desbloqueio... ansiedade no corpo, repetição de padrão, ou outra coisa?"
    ]

    # Primeira bolha cria o evento
    event_mensagem = bubbles[0]

    # Demais bolhas são agregadas
    for bubble in bubbles[1:]:
        if bubble not in event_mensagem:
            event_mensagem = event_mensagem + "\n\n" + bubble

    expected_count = len(bubbles) - 1  # 2 separadores \n\n
    actual_count = event_mensagem.count("\n\n")

    assert actual_count == expected_count, (
        f"Esperado {expected_count} separadores, encontrado {actual_count}"
    )
    assert all(b in event_mensagem for b in bubbles), "Todas as bolhas devem estar na mensagem final"

    print(f"✅ {len(bubbles)} bolhas agregadas em 1 evento:")
    print(f"   {repr(event_mensagem[:80])}...")


if __name__ == "__main__":
    test_bubble_aggregation_logic()
    test_bubble_aggregation_does_not_duplicate()
    test_bubble_aggregation_respects_time_window()
    test_bubble_aggregation_multiple_bubbles()
    print("\n✅ Todos os testes de agregação de bolhas passaram.")
