from .providers import call_rag_llm

LANG_MAP = {
    "pt-br": "Português do Brasil",
    "pt-pt": "Português de Portugal (Europeu)",
    "en": "English",
    "es": "Español",
    "fr": "Français",
    "de": "Deutsch",
    "it": "Italiano",
    "ja": "Japanese (日本語)",
    "zh": "Chinese Simplified (中文简体)",
    "zh-tw": "Chinese Traditional (中文繁體)",
    "ar": "Arabic (العربية)",
    "ko": "Korean (한국어)",
    "ru": "Russian (Русский)",
    "hi": "Hindi (हिन्दी)",
    "nl": "Dutch (Nederlands)",
    "pl": "Polish (Polski)",
    "tr": "Turkish (Türkçe)",
    "sv": "Swedish (Svenska)",
    "no": "Norwegian (Norsk)",
    "da": "Danish (Dansk)",
    "fi": "Finnish (Suomi)",
    "el": "Greek (Ελληνικά)",
    "cs": "Czech (Čeština)",
    "hu": "Hungarian (Magyar)",
    "ro": "Romanian (Română)",
    "uk": "Ukrainian (Українська)",
    "id": "Indonesian (Bahasa Indonesia)",
    "ms": "Malay (Bahasa Malaysia)",
    "th": "Thai (ภาษาไทย)",
    "vi": "Vietnamese (Tiếng Việt)",
    "he": "Hebrew (עبریת)",
    # Legacy aliases kept for backward compat
    "portuguese": "Português do Brasil",
    "english": "English",
    "spanish": "Español",
    "french": "Français",
    "german": "Deutsch",
    "italian": "Italiano",
    "japanese": "Japanese (日本語)",
    "chinese": "Chinese Simplified (中文简体)",
    "arabic": "Arabic (العربية)",
}

async def detect_language(text: str, model: str = "gpt-4o-mini", fallback: str = None):
    """Uses a cheap LLM call to detect the query language for PostgreSQL FTS."""
    try:
        # Mapping to valid PostgreSQL configurations
        valid_configs = ["portuguese", "english", "spanish", "french", "german", "simple"]
        
        response = await call_rag_llm(
            model=model,
            fallback=fallback,
            max_tokens=10,
            messages=[
                {"role": "system", "content": f"Identifique o idioma do texto. Responda APENAS com uma destas palavras: {', '.join(valid_configs)}. Diferencie entre português do Brasil e de Portugal apenas internamente, mas ambos devem retornar 'portuguese'."},
                {"role": "user", "content": text}
            ]
        )
        detected = response.choices[0].message.content.strip().lower()
        return (detected if detected in valid_configs else "simple"), response.usage
    except:
        return "simple", None

async def translate_to_portuguese(text: str, model: str = "gpt-4o-mini", fallback: str = None):
    """Translates non-portuguese queries to Portuguese for better RAG matching."""
    try:
        response = await call_rag_llm(
            model=model,
            fallback=fallback,
            max_tokens=200,
            messages=[
                {"role": "system", "content": "Traduza o texto do usuário para o Português do Brasil de forma natural e técnica. Mantenha nomes próprios ou códigos técnicos inalterados. RESPONDA APENAS COM A TRADUÇÃO."},
                {"role": "user", "content": text}
            ]
        )
        return response.choices[0].message.content.strip(), response.usage
    except:
        return text, None # Fallback to original

async def detect_message_language(text: str, model: str = "gpt-4o-mini", fallback: str = None):
    """Detects the language of a user message for response translation purposes."""
    valid_codes = list(LANG_MAP.keys())
    try:
        response = await call_rag_llm(
            model=model,
            fallback=fallback,
            max_tokens=10,
            messages=[
                {"role": "system", "content": (
                    "Detect the language of the user's text. "
                    f"Respond ONLY with one of these codes: {', '.join(valid_codes)}. "
                    "Use 'pt-br' for Brazilian Portuguese and 'pt-pt' for European Portuguese. "
                    "If unsure, respond with 'en'."
                )},
                {"role": "user", "content": text}
            ]
        )
        code = response.choices[0].message.content.strip().lower()
        return (code if code in LANG_MAP else None), response.usage
    except:
        return None, None

async def translate_to_language(text: str, target_lang: str, model: str = "gpt-4o-mini", fallback: str = None):
    """Translates text to the specified target language."""
    target_name = LANG_MAP.get(target_lang, target_lang)
    try:
        response = await call_rag_llm(
            model=model,
            fallback=fallback,
            max_tokens=2000,
            messages=[
                {"role": "system", "content": f"Translate the user's text to {target_name}. Preserve formatting, emojis, line breaks, and technical terms. Respond ONLY with the translation, nothing else."},
                {"role": "user", "content": text}
            ]
        )
        return response.choices[0].message.content.strip(), response.usage
    except:
        return text, None  # Fallback to original on error
