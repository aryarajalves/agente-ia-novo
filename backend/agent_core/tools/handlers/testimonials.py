import os
import json
import mimetypes
import httpx
import logging
from collections import Counter
from sqlalchemy import select, func
from models import TestimonialModel, SentTestimonialModel, WebhookConfigModel
from s3_service import s3_service

logger = logging.getLogger(__name__)

# Rótulos em português (singular/plural) para cada media_type conhecido, usados para detalhar
# quantos depoimentos de cada tipo ainda restam (ex: "3 imagens e 1 vídeo").
_MEDIA_TYPE_LABELS = {
    "image": ("imagem", "imagens"),
    "video": ("vídeo", "vídeos"),
}


def _describe_remaining_by_type(remaining_items):
    """Monta uma string tipo '3 imagens e 1 vídeo' contando os itens restantes por media_type."""
    counts = Counter(t.media_type for t in remaining_items)
    parts = []
    for media_type, count in counts.items():
        singular, plural = _MEDIA_TYPE_LABELS.get(media_type, (media_type, media_type))
        parts.append(f"{count} {singular if count == 1 else plural}")
    if not parts:
        return ""
    if len(parts) == 1:
        return parts[0]
    return ", ".join(parts[:-1]) + " e " + parts[-1]

async def handle_send_testimonial(db, context_variables, media_type: str, category: str, limit: int = 1):
    """
    Handler da ferramenta 'enviar_depoimento'.
    Busca depoimentos inéditos no banco, faz o download do MinIO e envia para o ZapVoice/Chatwoot limitando a quantidade.
    """
    phone = context_variables.get("contact_phone")
    conversation_id = context_variables.get("conversation_id")
    wid = context_variables.get("webhook_config_id")
    
    if not phone:
        return "Erro: Telefone do contato não disponível para envio do depoimento."
        
    if not conversation_id:
        return "Erro: Identificador da conversa não disponível para envio do depoimento."

    try:
        # 1. Obter credenciais do ZapVoice/Chatwoot
        zv_url, zv_token, client_id = None, None, None
        if wid:
            config_res = await db.execute(select(WebhookConfigModel).where(WebhookConfigModel.id == int(wid)))
            config_obj = config_res.scalar_one_or_none()
            if config_obj:
                zv_url = config_obj.zapvoice_url
                zv_token = config_obj.zapvoice_api_token
                client_id = config_obj.zapvoice_client_id

        if not zv_url:
            zv_url = os.getenv("ZAPVOICE_URL")
        if not zv_token:
            zv_token = os.getenv("ZAPVOICE_API_TOKEN")
        if not client_id:
            client_id = context_variables.get("client_id") or context_variables.get("account_id")

        if not zv_url or not zv_token or not client_id:
            logger.error("Credenciais do ZapVoice/Chatwoot incompletas para envio de depoimentos.")
            return "Erro: Configuração de integração com WhatsApp ausente."

        # 2. Filtrar depoimentos por categoria e mídias já enviadas
        # Busca IDs dos depoimentos já enviados para este telefone
        sent_stmt = select(SentTestimonialModel.testimonial_id).where(SentTestimonialModel.phone == phone)
        sent_res = await db.execute(sent_stmt)
        sent_ids = [r[0] for r in sent_res.all()]

        # Busca depoimentos disponíveis
        stmt = select(TestimonialModel).where(TestimonialModel.category == category)
        if media_type != "any":
            stmt = stmt.where(TestimonialModel.media_type == media_type)
        if sent_ids:
            stmt = stmt.where(TestimonialModel.id.notin_(sent_ids))

        # Ordem de disparo: respeita a posição manual configurada no painel (order_position,
        # menor número primeiro). Depoimentos sem posição definida (NULL) vão para o final,
        # na ordem de criação — mesma regra usada na listagem do painel (api/routers/testimonials.py).
        stmt = stmt.order_by(
            func.coalesce(TestimonialModel.order_position, 2147483647).asc(),
            TestimonialModel.created_at.asc()
        )
        res = await db.execute(stmt)
        available = res.scalars().all()

        if not available:
            logger.info(f"Nenhum depoimento inédito ({media_type}) encontrado para a categoria '{category}' e telefone {phone}.")
            return f"Desculpe, não tenho mais depoimentos inéditos no momento para te mostrar."

        # Seleciona os primeiros da fila, já na ordem manual configurada pelo dono do projeto.
        selected_testimonials = available[:limit]
        
        # Contrato oficial do ZapVoice para envio de mídia (confirmado pelo dono do projeto): fluxo em 2 etapas.
        # 1) POST {api}/upload (multipart, campo "file") -> devolve {"url": "..."} pública do arquivo.
        # 2) POST {api}/chat/conversations/{id}/media (JSON: media_url, message_type, caption) -> dispara no WhatsApp.
        # Autenticação em ambas as etapas: "Authorization: Bearer" + "X-Client-ID" (mesmo padrão de zapvoice_utils.py).
        zv_url_clean = zv_url.strip().rstrip("/")
        if not zv_url_clean.endswith("/api"):
            zv_url_clean = f"{zv_url_clean}/api"

        upload_url = f"{zv_url_clean}/upload"
        media_send_url = f"{zv_url_clean}/chat/conversations/{conversation_id}/media"
        headers = {
            "Authorization": f"Bearer {zv_token}",
            "X-Client-ID": str(client_id)
        }

        sent_count = 0
        last_error_detail = None
        sent_media_info = []  # Exposto via context_variables para o Pipeline renderizar as mídias enviadas
        sent_ids_this_call = set()  # Para calcular corretamente o que sobrou por tipo de mídia (só conta quem realmente foi enviado)
        for testimonial in selected_testimonials:
            # 3. Baixar arquivo do MinIO/S3 temporariamente
            temp_dir = os.path.join(os.getcwd(), "tmp_uploads")
            os.makedirs(temp_dir, exist_ok=True)
            temp_file_path = os.path.join(temp_dir, f"temp_send_{testimonial.id}_{testimonial.filename}")
            
            try:
                with open(temp_file_path, "wb") as f:
                    s3_service.s3_client.download_fileobj(
                        s3_service.bucket_name,
                        testimonial.s3_key,
                        f
                    )
            except Exception as download_err:
                logger.error(f"Erro ao baixar depoimento {testimonial.s3_key} do S3: {download_err}")
                last_error_detail = f"Falha ao baixar mídia do storage: {download_err}"
                continue

            content_type = mimetypes.guess_type(testimonial.filename)[0] or "application/octet-stream"

            success = False
            try:
                # Usamos httpx.Client síncrono para estabilidade de DNS sob o pool de threads do Celery
                with httpx.Client(timeout=30) as client:
                    # Etapa 1: upload do arquivo para gerar a URL pública no ZapVoice
                    with open(temp_file_path, "rb") as file_data:
                        files = {"file": (testimonial.filename, file_data, content_type)}
                        upload_resp = client.post(upload_url, files=files, headers=headers)

                    if upload_resp.status_code not in (200, 201):
                        logger.error(f"Erro no upload de mídia para o ZapVoice: Status {upload_resp.status_code} | {upload_resp.text}")
                        last_error_detail = f"Falha no upload (POST /upload) retornou {upload_resp.status_code}: {upload_resp.text[:200]}"
                    else:
                        media_url = (upload_resp.json() or {}).get("url")
                        if not media_url:
                            logger.error(f"Upload de mídia no ZapVoice não retornou 'url': {upload_resp.text}")
                            last_error_detail = "Upload no ZapVoice não retornou a URL do arquivo."
                        else:
                            # Etapa 2: dispara a mídia na conversa usando a URL gerada no upload
                            # "caption" é opcional na API do ZapVoice: só enviamos o campo se o depoimento
                            # tiver uma legenda customizada cadastrada no painel. Sem legenda, a mídia vai
                            # sozinha, sem nenhum texto junto.
                            media_payload = {
                                "media_url": media_url,
                                "message_type": testimonial.media_type
                            }
                            if testimonial.caption:
                                media_payload["caption"] = testimonial.caption
                            media_resp = client.post(
                                media_send_url,
                                json=media_payload,
                                headers={**headers, "Content-Type": "application/json"}
                            )
                            if media_resp.status_code in (200, 201):
                                success = True
                            else:
                                logger.error(f"Erro ao disparar mídia na conversa via ZapVoice: Status {media_resp.status_code} | {media_resp.text}")
                                last_error_detail = f"API ZapVoice (/chat/conversations/.../media) retornou {media_resp.status_code}: {media_resp.text[:200]}"
            except Exception as post_err:
                logger.error(f"Erro na requisição HTTP de envio de mídia: {post_err}")
                last_error_detail = f"Falha na requisição HTTP: {post_err}"
            finally:
                if os.path.exists(temp_file_path):
                    os.remove(temp_file_path)

            if success:
                new_history = SentTestimonialModel(
                    phone=phone,
                    testimonial_id=testimonial.id
                )
                db.add(new_history)
                sent_count += 1
                sent_ids_this_call.add(testimonial.id)
                sent_media_info.append({
                    "filename": testimonial.filename,
                    "media_type": testimonial.media_type,
                    # URL própria do S3/MinIO (24h) em vez da URL retornada pelo ZapVoice, que pode
                    # apontar para um host interno não acessível pelo navegador de quem vê o Pipeline.
                    "url": s3_service.get_public_url(testimonial.s3_key)
                })

        if sent_count == 0:
            detalhe = f" Detalhe: {last_error_detail}" if last_error_detail else ""
            return f"Erro ao enviar a(s) mídia(s) do depoimento para a conversa.{detalhe}"

        context_variables["_last_testimonial_media"] = sent_media_info
        await db.commit()

        # ATENÇÃO: se algum item selecionado (dentro do "limit" configurado no agente) falhou no
        # meio do caminho (download do S3, upload no ZapVoice ou disparo da mídia), sent_count fica
        # MENOR que o número de mídias que deveriam ter sido enviadas — mas antes disso passava
        # batido em silêncio (só era logado, não aparecia em lugar nenhum visível no painel/Pipeline).
        # Log de erro (linha correspondente já registrado acima via logger.error) continua sendo a
        # fonte completa do detalhe técnico; aqui só sinalizamos que houve falha parcial.
        attempted_count = len(selected_testimonials)
        failed_count = attempted_count - sent_count
        aviso_falha_parcial = ""
        if failed_count > 0:
            logger.warning(
                f"Envio parcial de depoimentos: {sent_count}/{attempted_count} enviados com sucesso "
                f"(categoria='{category}', media_type='{media_type}'). Último erro: {last_error_detail}"
            )
            aviso_falha_parcial = (
                f" AVISO_INTERNO (NÃO repasse isso ao usuário, é só para o painel de depuração): "
                f"{failed_count} mídia(s) das {attempted_count} selecionadas falharam ao enviar. "
                f"Detalhe técnico: {last_error_detail}"
            )

        # Calcula quantos depoimentos inéditos daquela categoria ainda restam no banco, e quebra
        # por tipo de mídia (imagem, vídeo, etc.) para o agente poder falar com mais precisão
        # (ex: "ainda tenho mais vídeos guardados") em vez de só um número genérico.
        remaining_items = [t for t in available if t.id not in sent_ids_this_call]
        remaining_count = len(remaining_items)
        if remaining_count > 0:
            breakdown = _describe_remaining_by_type(remaining_items)
            detalhe_tipos = f" (sendo {breakdown})" if breakdown else ""
            return f"Sucesso: {sent_count} depoimento(s) enviado(s) para o WhatsApp do usuário. RESTANTE: Ainda possuímos mais {remaining_count} depoimento(s) inédito(s) para esta categoria{detalhe_tipos}. Avise ao usuário de forma sutil que você possui mais depoimentos guardados caso ele deseje ver mais.{aviso_falha_parcial}"
        else:
            return f"Sucesso: {sent_count} depoimento(s) enviado(s) para o WhatsApp do usuário. RESTANTE: Este foi o último depoimento inédito disponível para esta categoria. Avise ao usuário que este foi o último depoimento que você possuía em seu acervo.{aviso_falha_parcial}"

    except Exception as e:
        logger.error(f"Erro no handler handle_send_testimonial: {e}", exc_info=True)
        return "Erro interno ao processar o envio de depoimentos."
