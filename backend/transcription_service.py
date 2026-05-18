import os
import logging
import asyncio
from openai import AsyncOpenAI
import assemblyai as aai

logger = logging.getLogger(__name__)

async def transcribe_video(file_path: str, config_params: dict = None) -> dict:
    """
    Transcreve um arquivo de áudio ou vídeo usando única e exclusivamente o provedor AssemblyAI.
    """
    assemblyai_key = os.getenv("ASSEMBLYAI_API_KEY")
    if not assemblyai_key or assemblyai_key == "YOUR_ASSEMBLY_API_KEY_HERE":
        raise ValueError("ASSEMBLYAI_API_KEY não configurado ou está com valor padrão no .env")

    try:
        # Executa de forma assíncrona não bloqueante usando run_in_executor
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            transcribe_assemblyai,
            file_path,
            assemblyai_key,
            config_params
        )
    except Exception as e:
        logger.error(f"Erro na transcrição AssemblyAI: {e}")
        raise

async def transcribe_openai(file_path: str, api_key: str) -> dict:
    logger.info(f"Iniciando transcrição OpenAI (Whisper) para: {file_path}")
    client = AsyncOpenAI(api_key=api_key)
    with open(file_path, "rb") as audio_file:
        transcript = await client.audio.transcriptions.create(
            model="whisper-1", 
            file=audio_file,
            response_format="json",
            prompt="Transcrição fiel do áudio no idioma original. Exemplos de termos que podem aparecer: My Hero Academia, Mahiru Academy, animes, cultura pop. Mantenha a pontuação natural."
        )
    
    text = transcript.text.strip()
    
    # Filtro básico contra alucinações comuns do Whisper em áudios curtos/silenciosos
    hallucinations = [
        "Thank you.", "Thank you", "Thanks for watching.", "Keep watching", 
        "Subscribe to my channel", "Please subscribe", "We feel lucky", "I'll see you in the next one"
    ]
    if text in hallucinations or len(text) < 2:
        logger.info(f"🚫 Alucinação detectada e filtrada: '{text}'")
        text = ""

    return {
        "text": text,
        "duration": 0,
        "provider": "OpenAI (Whisper)"
    }

async def transcribe_gemini_openai_compat(file_path: str, api_key: str) -> dict:
    """
    Nota: O endpoint compatível da Gemini às vezes tem limitações com áudio direto via Whisper.
    Se falhar, o ideal seria usar o SDK nativo, mas tentamos aqui primeiro.
    """
    logger.info(f"Iniciando transcrição Gemini (compat-mode) para: {file_path}")
    client = AsyncOpenAI(
        api_key=api_key,
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
    )
    # Por enquanto, Gemini via OpenAI compatible foca em chat. 
    # Áudio geralmente requer o SDK nativo ou Vertex AI.
    # Se chegarmos aqui e falhar, o fallback cuidará disso.
    with open(file_path, "rb") as audio_file:
        transcript = await client.audio.transcriptions.create(
            model="whisper-1", # Gemini pode não aceitar este nome no compat mode
            file=audio_file
        )
    return {"text": transcript.text, "duration": 0, "provider": "Gemini"}

def transcribe_assemblyai(file_path: str, api_key: str, config_params: dict = None) -> dict:
    logger.info(f"Iniciando transcrição AssemblyAI para: {file_path}")
    aai.settings.api_key = api_key
    
    trans_config = aai.TranscriptionConfig(
        language_detection=True,
        speaker_labels=config_params.get("speakerLabels", False) if config_params else False
    )
    
    transcriber = aai.Transcriber()
    transcript = transcriber.transcribe(file_path, config=trans_config)
    
    if transcript.status == aai.TranscriptStatus.error:
        raise Exception(f"Erro AssemblyAI: {transcript.error}")
        
    return {
        "text": transcript.text,
        "duration": transcript.audio_duration,
        "provider": "AssemblyAI"
    }
