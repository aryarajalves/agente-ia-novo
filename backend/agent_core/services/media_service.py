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


def is_conversational_hallucination(text: str) -> bool:
    """Verifica se o texto retornado parece ser uma resposta de chat conversacional em vez de uma transcrição literal."""
    lowered = text.lower().strip()
    # Frases típicas de assistentes que se oferecem para transcrever ou pedem o arquivo
    indicators = [
        "compartilhe o áudio",
        "compartilhe o audio",
        "envie o arquivo",
        "envie o áudio",
        "envie o audio",
        "gostaria que eu transcreva",
        "gostaria que eu transcrevesse",
        "você pode me enviar",
        "voce pode me enviar",
        "claro, por favor",
        "claro! por favor",
        "claro, envie",
        "como posso ajudar",
        "posso ajudar",
        "não contêm áudio",
        "não há áudio",
        "não foi possível transcrever",
        "áudio não fornecido",
        "insira o áudio",
        "insira o audio",
        "por favor, envie",
        "por favor envie"
    ]
    for ind in indicators:
        if ind in lowered:
            return True
    return False



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
            logger.info(f"🎙️ Iniciando transcrição de áudio via Whisper-1 como principal...")
            
            # Converter para MP3 para garantir compatibilidade
            try:
                converted_audio = await _convert_to_mp3(media_data)
            except Exception as conv_err:
                logger.error(f"Falha na conversão de áudio: {conv_err}")
                return {"error": f"Erro ao processar áudio: {conv_err}", "text": ""}
            
            # 1. Tentar Whisper-1 primeiro (ASR dedicado)
            temp_audio_path = None
            whisper_success = False
            transcription = ""
            
            try:
                with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_audio_file:
                    temp_audio_file.write(converted_audio)
                    temp_audio_path = temp_audio_file.name
                
                logger.info(f"📤 Enviando áudio para Whisper-1...")
                with open(temp_audio_path, "rb") as audio_file:
                    transcript = await client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file,
                        response_format="json",
                        prompt="Transcrição fiel do áudio no idioma original. Mantenha a pontuação natural."
                    )
                
                transcription = transcript.text.strip()
                
                # Filtro contra alucinações comuns do Whisper em áudios silenciosos
                hallucinations = [
                    "Thank you.", "Thank you", "Thanks for watching.", "Keep watching", 
                    "Subscribe to my channel", "Please subscribe", "We feel lucky", "I'll see you in the next one"
                ]
                if transcription in hallucinations or len(transcription) < 2:
                    logger.info(f"🚫 Alucinação detectada e filtrada no Whisper: '{transcription}'")
                    transcription = ""
                
                whisper_success = True
                logger.info(f"✅ Transcrição obtida com sucesso via Whisper-1")
                return {
                    "text": transcription,
                    "model": "whisper-1",
                    "usage": {}
                }
            except Exception as whisper_err:
                logger.warning(f"⚠️ Falha na transcrição via Whisper-1: {whisper_err}. Iniciando fallback para gpt-audio...")
            finally:
                if temp_audio_path and os.path.exists(temp_audio_path):
                    try:
                        os.remove(temp_audio_path)
                    except Exception as rm_err:
                        logger.error(f"Não foi possível remover arquivo temporário {temp_audio_path}: {rm_err}")
            
            # 2. Fallback para GPT-Audio (Multimodal Chat)
            if not whisper_success:
                try:
                    audio_b64 = base64.b64encode(converted_audio).decode('utf-8')
                    logger.info(f"📤 Enviando áudio (Base64 length: {len(audio_b64)}) para gpt-audio...")
                    
                    response = await client.chat.completions.create(
                        model="gpt-audio",
                        modalities=["text"],
                        messages=[
                            {
                                "role": "system",
                                "content": (
                                    "Você é um transcritor automático de áudio extremamente fiel. "
                                    "Sua única tarefa é ouvir o áudio fornecido e transcrever exatamente o que é falado, "
                                    "sem adicionar saudações, explicações, comentários ou formatações conversacionais de bate-papo. "
                                    "Se o áudio contiver apenas silêncio ou ruído, responda com uma string vazia."
                                )
                            },
                            {
                                "role": "user",
                                "content": [
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
                    
                    raw_text = response.choices[0].message.content or ""
                    
                    # Validar se o texto retornado não é uma alucinação conversacional
                    if is_conversational_hallucination(raw_text):
                        logger.warning(f"🚫 Detectada alucinação conversacional do gpt-audio: '{raw_text}'. Descartando resultado.")
                        raise Exception("O gpt-audio gerou uma resposta conversacional em vez de uma transcrição fiel.")
                    
                    logger.info(f"✅ Transcrição obtida via fallback gpt-audio")
                    return {
                        "text": raw_text.strip(),
                        "model": "gpt-audio",
                        "usage": response.usage.to_dict() if hasattr(response, 'usage') else {}
                    }
                except Exception as gpt_audio_err:
                    logger.error(f"❌ Falha crítica: Whisper-1 e gpt-audio falharam. Erro gpt-audio: {gpt_audio_err}")
                    return {"error": f"Erro na transcrição de áudio: {gpt_audio_err}", "text": ""}

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
