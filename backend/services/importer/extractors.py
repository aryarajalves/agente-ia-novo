import io
import pdfplumber
import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Any

async def extract_text_from_url(url: str) -> str:
    """Fetches the content of a URL and extracts the main text."""
    try:
        response = requests.get(url, timeout=15, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        })
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        for element in soup(["script", "style", "nav", "footer", "header", "aside"]):
            element.decompose()
            
        text = soup.get_text(separator=' ')
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = '\n'.join(chunk for chunk in chunks if chunk)
        
        return text
    except Exception as e:
        print(f"Error scraping URL: {e}")
        return ""

async def extract_text_from_image(file_content: bytes) -> List[Dict[str, Any]]:
    """Uses GPT-4o with Vision to extract all text from an image."""
    from agent import get_openai_client
    import base64
    
    client = get_openai_client("gpt-4o")
    if not client: return []
        
    base64_image = base64.b64encode(file_content).decode('utf-8')
    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Extraia todo o texto literal desta imagem. Retorne apenas o texto encontrado, mantendo a formatação e quebras de linha se possível. Se houver tabelas, mantenha a estrutura de colunas."},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}},
                    ],
                }
            ],
            max_tokens=4000,
        )
        return [{"text": response.choices[0].message.content, "page": 1}]
    except Exception as e:
        print(f"Error extracting text from image with Vision: {e}")
        return []

async def extract_text_from_image_b64(base64_image: str) -> str:
    """Uses GPT-4o with Vision to extract/describe content from a base64 image."""
    from agent import get_openai_client
    client = get_openai_client("gpt-4o")
    if not client: return ""

    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "Esta é uma página de um manual técnico. "
                                "Descreva detalhadamente qualquer gráfico, diagrama, tabela ou imagem presente. "
                                "Se houver texto nas imagens, transcreva-o. "
                                "Se houver botões ou ícones de interface, descreva sua função. "
                                "Retorne apenas o conteúdo extraído, sem comentários adicionais."
                            )
                        },
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{base64_image}"}},
                    ],
                }
            ],
            max_tokens=2000,
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        print(f"[Vision b64] Error: {e}")
        return ""

async def render_page_as_image(file_bytes: bytes, page_num: int) -> str | None:
    """Renders a PDF page to a base64 PNG image."""
    try:
        import pypdfium2 as pdfium
        import base64
        pdf = pdfium.PdfDocument(file_bytes)
        if page_num < 1 or page_num > len(pdf): return None
        page = pdf[page_num - 1]
        bitmap = page.render(scale=2.0)
        pil_image = bitmap.to_pil()
        buf = io.BytesIO()
        pil_image.save(buf, format='PNG')
        return base64.b64encode(buf.getvalue()).decode('utf-8')
    except Exception as e:
        print(f"[Vision] Erro ao renderizar página {page_num}: {e}")
        return None

async def extract_text_from_pdf(file_content: bytes, start_page: int = 1, end_page: int = None) -> List[Dict[str, Any]]:
    """Extracts text from a PDF file as a list of page objects."""
    pages_data = []
    try:
        with pdfplumber.open(io.BytesIO(file_content)) as pdf:
            total_pages = len(pdf.pages)
            start_idx = max(0, start_page - 1)
            end_idx = end_page if end_page and end_page <= total_pages else total_pages
            
            for i in range(start_idx, end_idx):
                page = pdf.pages[i]
                page_text = page.extract_text(layout=True) or ""
                pages_data.append({"text": page_text, "page": i + 1})
        return pages_data
    except Exception as e:
        print(f"DEBUG ERROR: Error extracting PDF: {e}")
        return []
