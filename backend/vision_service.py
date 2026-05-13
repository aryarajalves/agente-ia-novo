import os
import logging
import httpx
import base64
from openai import AsyncOpenAI
from typing import Optional

logger = logging.getLogger(__name__)

async def analyze_image(image_source: str, is_url: bool = True) -> dict:
    """
    Analisa uma imagem usando a API Vision da OpenAI (GPT-4o).
    image_source: URL da imagem ou path local.
    """
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        raise ValueError("OPENAI_API_KEY não configurada no ambiente.")

    client = AsyncOpenAI(api_key=openai_key)
    
    prompt = (
        "Analise esta imagem detalhadamente. Se houver textos, comprovantes, "
        "números ou documentos, extraia as informações textuais importantes (OCR). "
        "Se for uma cena, descreva o que está acontecendo. "
        "Responda de forma concisa e direta para que um agente de IA possa entender o contexto."
    )

    print(f"🖼️ Vision: Iniciando análise de imagem: {image_source}")
    try:
        if is_url:
            # Para URLs, baixamos e convertemos para base64 para garantir compatibilidade
            base64_image = await _download_image_as_base64(image_source)
        else:
            with open(image_source, "rb") as image_file:
                base64_image = base64.b64encode(image_file.read()).decode('utf-8')

        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}",
                            },
                        },
                    ],
                }
            ],
            max_tokens=500,
        )
        description = response.choices[0].message.content
        print(f"✅ Vision: Sucesso na análise. Resultado: {description[:100]}...")
        return {
            "description": description,
            "model": "gpt-4o"
        }
    except Exception as e:
        print(f"❌ Vision: Erro fatal na análise: {e}")
        raise e

async def _download_image_as_base64(url: str) -> str:
    """Baixa uma imagem de uma URL e retorna em base64."""
    async with httpx.AsyncClient(follow_redirects=True) as client:
        resp = await client.get(url, timeout=30.0)
        resp.raise_for_status()
        return base64.b64encode(resp.content).decode('utf-8')
