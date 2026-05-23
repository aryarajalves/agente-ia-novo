import os
import uuid
import io
import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from api.deps import verify_api_key
from s3_service import s3_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Media"])

@router.post("/upload-image")
async def upload_image_endpoint(file: UploadFile = File(...), _: None = Depends(verify_api_key)):
    """Faz o upload de uma imagem para o S3 (ou local como fallback) e retorna a URL pública."""
    logger.info(f"Recebendo upload de imagem: {file.filename}")

    if not file.filename:
        raise HTTPException(status_code=400, detail="Arquivo sem nome")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        if file.content_type == "image/jpeg": ext = ".jpg"
        elif file.content_type == "image/png": ext = ".png"
        elif file.content_type == "image/webp": ext = ".webp"
        else: ext = ".png"

    filename = f"{uuid.uuid4()}{ext}"

    try:
        content = await file.read()
    except Exception as e:
        logger.error(f"Erro ao ler arquivo: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno ao ler imagem: {str(e)}")

    # --- Tenta upload no S3 ---
    s3_configured = all([
        os.getenv("S3_ENDPOINT_URL"),
        os.getenv("S3_ACCESS_KEY"),
        os.getenv("S3_SECRET_KEY"),
        os.getenv("S3_BUCKET_NAME"),
    ])

    if s3_configured:
        try:
            s3_key = f"chat-images/{filename}"
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(
                None,
                lambda: s3_service.s3_client.put_object(
                    Bucket=s3_service.bucket_name,
                    Key=s3_key,
                    Body=content,
                    ContentType=file.content_type or "image/jpeg",
                )
            )
            public_url = s3_service.get_public_url(s3_key)
            if public_url:
                logger.info(f"✅ Imagem enviada ao S3: {public_url}")
                return {"image_url": public_url, "filename": filename, "storage": "s3"}
        except Exception as e:
            logger.error(f"Erro no upload S3: {e} — usando fallback local.")

    # --- Fallback: salvar localmente ---
    os.makedirs("tmp_uploads", exist_ok=True)
    upload_path = os.path.join("tmp_uploads", filename)
    try:
        with open(upload_path, "wb") as f:
            f.write(content)
    except Exception as e:
        logger.error(f"Erro ao salvar arquivo local: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno ao salvar imagem: {str(e)}")

    base_url = os.getenv("BACKEND_URL", os.getenv("VITE_API_URL", "http://localhost:8000")).rstrip('/')
    image_url = f"{base_url}/uploads/{filename}"
    return {"image_url": image_url, "filename": filename, "storage": "local"}


@router.post("/transcribe-audio")
async def transcribe_audio_endpoint(
    file: UploadFile = File(...),
    _: None = Depends(verify_api_key)
):
    """Faz o upload de um arquivo de áudio, transcreve usando a OpenAI (Whisper) e retorna o texto transcrito."""
    logger.info(f"Recebendo upload de áudio para transcrição: {file.filename}")

    if not file.filename:
        raise HTTPException(status_code=400, detail="Arquivo sem nome")

    ext = os.path.splitext(file.filename)[1].lower()
    if not ext:
        if file.content_type == "audio/webm": ext = ".webm"
        elif file.content_type == "audio/ogg": ext = ".ogg"
        elif file.content_type == "audio/mp3": ext = ".mp3"
        elif file.content_type == "audio/wav": ext = ".wav"
        elif file.content_type == "audio/x-m4a": ext = ".m4a"
        else: ext = ".webm"

    filename = f"{uuid.uuid4()}{ext}"
    os.makedirs("tmp_uploads", exist_ok=True)
    temp_path = os.path.join("tmp_uploads", filename)

    try:
        content = await file.read()
        with open(temp_path, "wb") as f:
            f.write(content)
    except Exception as e:
        logger.error(f"Erro ao salvar arquivo de áudio temporário: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno ao salvar áudio: {str(e)}")

    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        logger.error("OPENAI_API_KEY não configurada no servidor.")
        raise HTTPException(status_code=500, detail="Chave da OpenAI (OPENAI_API_KEY) não configurada no servidor.")

    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=openai_key)

    # Filtro de alucinação comum em silêncio
    hallucinations = [
        "Thank you.", "Thank you", "Thanks for watching.", "Keep watching",
        "Subscribe to my channel", "Please subscribe", "We feel lucky", "I'll see you in the next one"
    ]

    try:
        logger.info(f"Enviando {temp_path} para Whisper-1...")
        with open(temp_path, "rb") as audio_file:
            transcript = await client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="json",
                prompt="Transcrição fiel do áudio no idioma original. Mantenha a pontuação natural."
            )
        transcription = transcript.text.strip()
        logger.info(f"Transcrição Whisper-1 obtida com sucesso: '{transcription}'")

        if transcription in hallucinations or len(transcription) < 2:
            transcription = ""

        base_url = os.getenv("BACKEND_URL", os.getenv("VITE_API_URL", "http://localhost:8000")).rstrip('/')
        audio_url = f"{base_url}/uploads/{filename}"

        return {
            "text": transcription,
            "audio_url": audio_url,
            "filename": filename
        }
    except Exception as err:
        logger.warning(f"Falha na transcrição direta do Whisper-1: {err}. Tentando conversão com ffmpeg...")
        try:
            from agent_core.services.media_service import _convert_to_mp3
            converted_audio = await _convert_to_mp3(content)
            
            # Sobrescreve o arquivo temporário com o formato convertido (.mp3)
            # Mas mudamos o nome do arquivo para ter .mp3 se já não tiver
            mp3_filename = filename
            if not filename.endswith(".mp3"):
                mp3_filename = f"{os.path.splitext(filename)[0]}.mp3"
                
            mp3_temp_path = os.path.join("tmp_uploads", mp3_filename)
            with open(mp3_temp_path, "wb") as f:
                f.write(converted_audio)
                
            # Remove o original se o nome mudou
            if temp_path != mp3_temp_path and os.path.exists(temp_path):
                os.remove(temp_path)
                
            logger.info(f"Enviando áudio convertido {mp3_temp_path} para Whisper-1...")
            with open(mp3_temp_path, "rb") as audio_file:
                transcript = await client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="json",
                    prompt="Transcrição fiel do áudio no idioma original. Mantenha a pontuação natural."
                )
            transcription = transcript.text.strip()
            logger.info(f"Transcrição após conversão obtida com sucesso: '{transcription}'")
            
            if transcription in hallucinations or len(transcription) < 2:
                transcription = ""
                
            base_url = os.getenv("BACKEND_URL", os.getenv("VITE_API_URL", "http://localhost:8000")).rstrip('/')
            audio_url = f"{base_url}/uploads/{mp3_filename}"
            
            return {
                "text": transcription,
                "audio_url": audio_url,
                "filename": mp3_filename
            }
        except Exception as retry_err:
            logger.error(f"Erro persistente na transcrição de áudio: {retry_err}")
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise HTTPException(status_code=500, detail=f"Erro na transcrição de áudio: {str(retry_err)}")

