import io
import re
import json
import pdfplumber
from typing import List, Dict, Any, Union
from .extractors import render_page_as_image, extract_text_from_image_b64

def detect_sections(pages_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Detects section boundaries in PDF text by identifying heading lines."""
    HEADING_RE = re.compile(r'^[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ\s/\-]{3,60}$')
    MIN_SECTION_CHARS = 200

    sections = []
    current_title = "Introdução"
    current_pages = []
    current_start = pages_data[0]["page"] if pages_data else 1

    def flush_section():
        nonlocal current_title, current_pages, current_start
        combined = "\n".join(p.get("text", "") for p in current_pages)
        if combined.strip() and len(combined) >= MIN_SECTION_CHARS:
            sections.append({
                "title": current_title,
                "text": combined,
                "start_page": current_start,
                "end_page": current_pages[-1]["page"] if current_pages else current_start,
            })

    for page_obj in pages_data:
        lines = (page_obj.get("text") or "").split('\n')
        found_heading = False
        for line in lines:
            stripped = line.strip()
            if (stripped and HEADING_RE.match(stripped) and len(stripped) >= 3 
                and not stripped.endswith('.') and len(stripped.split()) <= 8):
                flush_section()
                current_title = stripped.title()
                current_pages = []
                current_start = page_obj["page"]
                found_heading = True
                break
        current_pages.append(page_obj)

    flush_section()
    if len(sections) < 3:
        full_text = "\n".join(p.get("text", "") for p in pages_data)
        return [{
            "title": "Documento Completo",
            "text": full_text,
            "start_page": pages_data[0]["page"] if pages_data else 1,
            "end_page": pages_data[-1]["page"] if pages_data else 1,
        }]
    return sections

async def extract_visual_content_from_section(file_bytes: bytes, section: dict) -> str:
    """Extracts visual content from pages in a section using GPT-4o Vision."""
    visual_parts = []
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            total_pages = len(pdf.pages)
            start = section.get("start_page", 1)
            end = section.get("end_page", total_pages)

            for page_num in range(start, min(end + 1, total_pages + 1)):
                page = pdf.pages[page_num - 1]
                if page.images:
                    b64 = await render_page_as_image(file_bytes, page_num)
                    if b64:
                        content = await extract_text_from_image_b64(b64)
                        if content and content.strip():
                            visual_parts.append(f"[Página {page_num} - Conteúdo Visual]:\n{content}")
    except Exception as e:
        print(f"[Vision] Erro ao processar seção '{section.get('title')}': {e}")
    return "\n\n".join(visual_parts)

def chunk_text(pages_data: Union[List[Dict[str, Any]], str], chunk_size: int = 1500, overlap: int = 200) -> List[Dict[str, Any]]:
    """Splits text into chunks, preserving page metadata."""
    if isinstance(pages_data, str):
        pages_data = [{"text": pages_data, "page": None}]
    all_chunks = []
    for page_obj in pages_data:
        text, page_num = page_obj["text"], page_obj["page"]
        start, text_len = 0, len(text)
        while start < text_len:
            end = start + chunk_size
            if end >= text_len:
                all_chunks.append({"text": text[start:], "metadata": {"page": page_num}})
                break
            last_period = text.rfind('.', start, end)
            last_newline = text.rfind('\n', start, end)
            break_point = max(last_period, last_newline)
            if break_point != -1 and break_point > start + (chunk_size // 2):
                end = break_point + 1
            all_chunks.append({"text": text[start:end], "metadata": {"page": page_num}})
            start = end - overlap
    return all_chunks

def extract_json_list(text: str) -> List[Dict[str, Any]]:
    """Attempts to extract a JSON list from a string."""
    content = text.strip()
    if content.startswith("```json"): content = content[7:]
    if content.endswith("```"): content = content[:-3]
    if content.startswith("```"): content = content[3:]
    content = content.strip()
    
    try:
        data = json.loads(content)
        if isinstance(data, list): return data
    except: pass

    match = re.search(r'\[.*', content, re.DOTALL)
    if match:
        list_str = match.group().strip()
        last_bracket = list_str.rfind(']')
        if last_bracket != -1:
            try:
                data = json.loads(list_str[:last_bracket+1])
                if isinstance(data, list): return data
            except: pass
        try:
            last_obj_close = list_str.rfind('}')
            if last_obj_close != -1:
                truncated = list_str[:last_obj_close+1]
                if not truncated.strip().endswith(']'): truncated += ']'
                data = json.loads(truncated)
                if isinstance(data, list): return data
        except: pass
    return []
