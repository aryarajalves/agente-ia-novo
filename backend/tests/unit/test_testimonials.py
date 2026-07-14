import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from agent_core.tools.handlers.testimonials import handle_send_testimonial
from models import TestimonialModel, SentTestimonialModel, WebhookConfigModel

# Evita que o pytest tente coletar TestimonialModel e SentTestimonialModel como classes de testes
TestimonialModel.__test__ = False
SentTestimonialModel.__test__ = False
WebhookConfigModel.__test__ = False

@pytest.mark.asyncio
async def test_handle_send_testimonial_filters_duplicates():
    """Valida que o handler de depoimentos não envia depoimentos repetidos para o mesmo lead."""
    db = AsyncMock()

    # Mock das configurações de Webhook
    mock_wh_config = WebhookConfigModel(
        id=1,
        zapvoice_url="http://zapvoice.local",
        zapvoice_api_token="test_token",
        zapvoice_client_id="client123"
    )
    mock_wh_res = MagicMock()
    mock_wh_res.scalar_one_or_none.return_value = mock_wh_config

    # Mock dos depoimentos existentes na categoria
    t1 = TestimonialModel(id=1, filename="dep1.png", s3_key="testimonials/1.png", media_type="image", category="curso_a")
    t2 = TestimonialModel(id=2, filename="dep2.png", s3_key="testimonials/2.png", media_type="image", category="curso_a")

    # Mock do retorno da consulta de enviados: o lead já recebeu o depoimento ID 1
    mock_sent_res = MagicMock()
    mock_sent_res.all.return_value = [(1,)]  # Retorna lista de tuplas [(id,)]
    
    # Mock do retorno da consulta de disponíveis: retorna t2 (já que t1 foi enviado)
    mock_available_res = MagicMock()
    mock_available_res.scalars.return_value.all.return_value = [t2]

    # Configuração dos retornos de query do DB (3 execuções: webhook_config, sent_testimonials, testimonials)
    db.execute = AsyncMock(side_effect=[mock_wh_res, mock_sent_res, mock_available_res])

    context = {
        "contact_phone": "5511999999999",
        "conversation_id": "123",
        "webhook_config_id": "1"
    }

    # Patch do download do boto3 e envio do HTTP do Chatwoot
    with patch("s3_service.s3_service.s3_client") as mock_s3_client, \
         patch("httpx.Client.post") as mock_post, \
         patch("os.path.exists", return_value=True), \
         patch("os.remove") as mock_remove, \
         patch("builtins.open", MagicMock()):

        # Mock da API externa (Chatwoot retorna 201 Created)
        mock_resp = MagicMock()
        mock_resp.status_code = 201
        mock_post.return_value = mock_resp

        result = await handle_send_testimonial(db, context, media_type="any", category="curso_a")

        # Verifica se o resultado foi de sucesso
        assert "Sucesso" in result
        assert "1 depoimento(s) enviado(s)" in result
        
        # Garante que inseriu no banco o registro de enviado para t2 (e não t1)
        db.add.assert_called_once()
        sent_record = db.add.call_args[0][0]
        assert isinstance(sent_record, SentTestimonialModel)
        assert sent_record.testimonial_id == 2
        assert sent_record.phone == "5511999999999"


@pytest.mark.asyncio
async def test_handle_send_testimonial_filters_by_media_type_video():
    """Valida que o handler filtra depoimentos especificamente do tipo de mídia solicitado."""
    db = AsyncMock()

    # Mock das configurações de Webhook
    mock_wh_config = WebhookConfigModel(
        id=1,
        zapvoice_url="http://zapvoice.local",
        zapvoice_api_token="test_token",
        zapvoice_client_id="client123"
    )
    mock_wh_res = MagicMock()
    mock_wh_res.scalar_one_or_none.return_value = mock_wh_config

    # Temos um vídeo (t2). O usuário pediu especificamente vídeo.
    t2 = TestimonialModel(id=2, filename="dep2.mp4", s3_key="testimonials/2.mp4", media_type="video", category="curso_a")

    mock_sent_res = MagicMock()
    mock_sent_res.all.return_value = [] # Nenhum enviado ainda
    
    mock_available_res = MagicMock()
    mock_available_res.scalars.return_value.all.return_value = [t2]

    # Configuração dos retornos de query do DB (3 execuções: webhook_config, sent_testimonials, testimonials)
    db.execute = AsyncMock(side_effect=[mock_wh_res, mock_sent_res, mock_available_res])

    context = {
        "contact_phone": "5511999999999",
        "conversation_id": "123",
        "webhook_config_id": "1"
    }

    with patch("s3_service.s3_service.s3_client"), \
         patch("httpx.Client.post") as mock_post, \
         patch("os.path.exists", return_value=True), \
         patch("os.remove"), \
         patch("builtins.open", MagicMock()):

        mock_resp = MagicMock()
        mock_resp.status_code = 201
        mock_post.return_value = mock_resp

        # Pedindo estritamente media_type="video"
        result = await handle_send_testimonial(db, context, media_type="video", category="curso_a")

        assert "Sucesso" in result
        assert "1 depoimento(s) enviado(s)" in result
        
        # Garante que registrou o envio do depoimento ID 2
        db.add.assert_called_once()
        sent_record = db.add.call_args[0][0]
        assert sent_record.testimonial_id == 2


@pytest.mark.asyncio
async def test_handle_send_testimonial_multi_limit():
    """Valida que o handler envia até o limite estipulado de depoimentos de uma vez."""
    db = AsyncMock()

    # Mock das configurações de Webhook
    mock_wh_config = WebhookConfigModel(
        id=1,
        zapvoice_url="http://zapvoice.local",
        zapvoice_api_token="test_token",
        zapvoice_client_id="client123"
    )
    mock_wh_res = MagicMock()
    mock_wh_res.scalar_one_or_none.return_value = mock_wh_config

    # Temos 3 depoimentos disponíveis
    t1 = TestimonialModel(id=1, filename="dep1.png", s3_key="testimonials/1.png", media_type="image", category="curso_a")
    t2 = TestimonialModel(id=2, filename="dep2.png", s3_key="testimonials/2.png", media_type="image", category="curso_a")
    t3 = TestimonialModel(id=3, filename="dep3.png", s3_key="testimonials/3.png", media_type="image", category="curso_a")

    mock_sent_res = MagicMock()
    mock_sent_res.all.return_value = [] # Nenhum enviado ainda
    
    mock_available_res = MagicMock()
    mock_available_res.scalars.return_value.all.return_value = [t1, t2, t3]

    # Configuração dos retornos de query do DB
    db.execute = AsyncMock(side_effect=[mock_wh_res, mock_sent_res, mock_available_res])

    context = {
        "contact_phone": "5511999999999",
        "conversation_id": "123",
        "webhook_config_id": "1"
    }

    with patch("s3_service.s3_service.s3_client"), \
         patch("httpx.Client.post") as mock_post, \
         patch("os.path.exists", return_value=True), \
         patch("os.remove"), \
         patch("builtins.open", MagicMock()):

        mock_resp = MagicMock()
        mock_resp.status_code = 201
        mock_post.return_value = mock_resp

        # Pedindo limite de 2 depoimentos
        result = await handle_send_testimonial(db, context, media_type="any", category="curso_a", limit=2)

        assert "Sucesso" in result
        assert "2 depoimento(s) enviado(s)" in result
        
        # Garante que registrou o envio de dois depoimentos (2 chamadas a db.add)
        assert db.add.call_count == 2
        calls = db.add.call_args_list
        assert calls[0][0][0].testimonial_id == 1
        assert calls[1][0][0].testimonial_id == 2


@pytest.mark.asyncio
async def test_handle_send_testimonial_respects_manual_order():
    """
    Testa se o handler respeita a ordem manual de disparo (order_position, aplicada via
    ORDER BY na query) em vez de qualquer prioridade fixa por tipo de mídia. A query já
    devolve os itens na ordem correta (função _order_by_position); o handler deve apenas
    pegar os primeiros da lista, na ordem em que vieram do banco.
    """
    db = AsyncMock()

    mock_wh_config = WebhookConfigModel(
        id=1,
        zapvoice_url="http://zapvoice.local",
        zapvoice_api_token="test_token",
        zapvoice_client_id="client123"
    )
    mock_wh_res = MagicMock()
    mock_wh_res.scalar_one_or_none.return_value = mock_wh_config

    # Um vídeo (t1) configurado com order_position=1 e uma imagem (t2) com order_position=2:
    # a query (mockada aqui já na ordem correta) deve devolver o vídeo primeiro, e o handler
    # deve respeitar essa ordem mesmo sendo media_type="any" (sem prioridade fixa para imagem).
    t1 = TestimonialModel(id=1, filename="dep1.mp4", s3_key="testimonials/1.mp4", media_type="video", category="curso_a", order_position=1)
    t2 = TestimonialModel(id=2, filename="dep2.png", s3_key="testimonials/2.png", media_type="image", category="curso_a", order_position=2)

    mock_sent_res = MagicMock()
    mock_sent_res.all.return_value = []

    mock_available_res = MagicMock()
    mock_available_res.scalars.return_value.all.return_value = [t1, t2]

    db.execute = AsyncMock(side_effect=[mock_wh_res, mock_sent_res, mock_available_res])

    context = {
        "contact_phone": "5511999999999",
        "conversation_id": "123",
        "webhook_config_id": "1"
    }

    with patch("s3_service.s3_service.s3_client"), \
         patch("httpx.Client.post") as mock_post, \
         patch("os.path.exists", return_value=True), \
         patch("os.remove"), \
         patch("builtins.open", MagicMock()):

        mock_resp = MagicMock()
        mock_resp.status_code = 201
        mock_post.return_value = mock_resp

        # Pedindo limite 1 com media_type any. Deve escolher t1 (primeiro na ordem manual), o vídeo.
        result = await handle_send_testimonial(db, context, media_type="any", category="curso_a", limit=1)

        assert "Sucesso" in result
        assert "1 depoimento(s) enviado(s)" in result

        # O depoimento inserido deve ser o t1 (primeiro na ordem manual configurada)
        db.add.assert_called_once()
        sent_record = db.add.call_args[0][0]
        assert sent_record.testimonial_id == 1


@pytest.mark.asyncio
async def test_handle_send_testimonial_priority_fallback_video():
    """Testa se o handler faz fallback para vídeo se o tipo for 'any' mas só houver vídeos disponíveis."""
    db = AsyncMock()

    mock_wh_config = WebhookConfigModel(
        id=1,
        zapvoice_url="http://zapvoice.local",
        zapvoice_api_token="test_token",
        zapvoice_client_id="client123"
    )
    mock_wh_res = MagicMock()
    mock_wh_res.scalar_one_or_none.return_value = mock_wh_config

    # Só temos vídeo disponível (t1)
    t1 = TestimonialModel(id=1, filename="dep1.mp4", s3_key="testimonials/1.mp4", media_type="video", category="curso_a")

    mock_sent_res = MagicMock()
    mock_sent_res.all.return_value = []
    
    mock_available_res = MagicMock()
    mock_available_res.scalars.return_value.all.return_value = [t1]

    db.execute = AsyncMock(side_effect=[mock_wh_res, mock_sent_res, mock_available_res])

    context = {
        "contact_phone": "5511999999999",
        "conversation_id": "123",
        "webhook_config_id": "1"
    }

    with patch("s3_service.s3_service.s3_client"), \
         patch("httpx.Client.post") as mock_post, \
         patch("os.path.exists", return_value=True), \
         patch("os.remove"), \
         patch("builtins.open", MagicMock()):

        mock_resp = MagicMock()
        mock_resp.status_code = 201
        mock_post.return_value = mock_resp

        # Com 'any' e sem imagens disponíveis, deve enviar o vídeo (t1)
        result = await handle_send_testimonial(db, context, media_type="any", category="curso_a", limit=1)

        assert "Sucesso" in result
        assert "1 depoimento(s) enviado(s)" in result
        
        # O depoimento inserido deve ser o t1 (vídeo)
        db.add.assert_called_once()
        sent_record = db.add.call_args[0][0]
        assert sent_record.testimonial_id == 1
