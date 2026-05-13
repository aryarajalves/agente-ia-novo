import os
import httpx
import logging
import base64
import subprocess
import tempfile
from openai import AsyncOpenAI
from core.timezone import get_now_br

logger = logging.getLogger(__name__)

async def _convert_to_mp3(audio_data: bytes) -> bytes:
    """Converte áudio para MP3 (64kbps, Mono) usando ffmpeg."""
    with tempfile.NamedTemporaryFile(suffix=".tmp", delete=False) as f_in:
        f_in.write(audio_data)
        in_path = f_in.name
    
    out_path = in_path + ".mp3"
    try:
        # Comando para converter para MP3 (formato amplamente aceito)
        cmd = [
            "ffmpeg", "-y", "-i", in_path, 
            "-codec:a", "libmp3lame", "-b:a", "64k", "-ac", "1", 
            out_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            logger.error(f"Erro no ffmpeg: {result.stderr}")
            raise Exception(f"ffmpeg falhou: {result.stderr}")
            
        with open(out_path, "rb") as f_out:
            data = f_out.read()
            logger.info(f"✅ Áudio convertido para MP3: {len(data)} bytes")
            return data
    finally:
        if os.path.exists(in_path): os.remove(in_path)
        if os.path.exists(out_path): os.remove(out_path)


async def process_media_content(url: str, message_type: str, api_key: str, chatwoot_token: str = None) -> dict:
    """
    Faz o download da mídia e processa usando GPT-4o (Vision ou Audio).
    Retorna um dicionário com o texto extraído e metadados.
    """
    if not api_key:
        return {"error": "API Key da OpenAI não configurada", "text": ""}

    client = AsyncOpenAI(api_key=api_key)
    
    try:
        # 1. Download da Mídia
        headers = {}
        if chatwoot_token:
            headers["api_access_token"] = chatwoot_token

        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as http_client:
            resp = await http_client.get(url, headers=headers)
            if resp.status_code != 200:
                return {"error": f"Erro ao baixar mídia: {resp.status_code}", "text": ""}
            media_data = resp.content

        # 2. Processamento por Tipo
        if message_type == "audio":
            logger.info(f"🎙️ Iniciando transcrição de áudio via GPT-4o-Audio (com conversão)...")
            
            # Converter para MP3 para garantir compatibilidade com gpt-4o-audio-preview
            try:
                converted_audio = await _convert_to_mp3(media_data)
                audio_b64 = base64.b64encode(converted_audio).decode('utf-8')
            except Exception as conv_err:
                logger.error(f"Falha na conversão de áudio: {conv_err}")
                return {"error": f"Erro ao processar áudio: {conv_err}", "text": ""}
            
            logger.info(f"📤 Enviando áudio (Base64 length: {len(audio_b64)}) para gpt-4o-audio-preview...")

            # Chamada para o GPT-4o-Audio-Preview usando input_audio
            response = await client.chat.completions.create(
                model="gpt-4o-audio-preview",
                modalities=["text"],
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Transcreva este áudio exatamente como foi dito, sem comentários adicionais."},
                            {
                                "type": "input_audio",
                                "input_audio": {
                                    "data": audio_b64,
                                    "format": "mp3"
                                }
                            }
                        ]
                    }
                ]
            )
            
            transcription = response.choices[0].message.content or ""
            return {
                "text": transcription,
                "model": "gpt-4o-audio-preview",
                "usage": response.usage.to_dict() if hasattr(response, 'usage') else {}
            }

        elif message_type == "image":
            logger.info(f"🖼️ Iniciando análise de imagem via GPT-4o-Vision...")
            
            # Codificar imagem em base64
            image_b64 = base64.b64encode(media_data).decode('utf-8')
            
            response = await client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Descreva o que você vê nesta imagem de forma detalhada para que um assistente de IA possa entender o contexto da conversa."},
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}
                            }
                        ]
                    }
                ],
                max_tokens=500
            )
            
            description = response.choices[0].message.content or ""
            return {
                "text": description,
                "model": "gpt-4o",
                "usage": response.usage.to_dict() if hasattr(response, 'usage') else {}
            }

        return {"error": "Tipo de mídia não suportado", "text": ""}

    except Exception as e:
        logger.error(f"Erro no processamento de mídia: {e}")
        return {"error": str(e), "text": ""}
