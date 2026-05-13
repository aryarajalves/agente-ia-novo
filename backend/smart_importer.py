"""
Proxy file to maintain backward compatibility with existing imports.
All logic has been moved to backend/services/importer/
"""

from services.importer import (
    extract_text_from_url,
    extract_text_from_image,
    extract_text_from_image_b64,
    render_page_as_image,
    extract_text_from_pdf,
    detect_sections,
    extract_visual_content_from_section,
    chunk_text,
    extract_json_list,
    generate_qa_from_text,
    generate_global_qa
)

__all__ = [
    'extract_text_from_url',
    'extract_text_from_image',
    'extract_text_from_image_b64',
    'render_page_as_image',
    'extract_text_from_pdf',
    'detect_sections',
    'extract_visual_content_from_section',
    'chunk_text',
    'extract_json_list',
    'generate_qa_from_text',
    'generate_global_qa'
]
