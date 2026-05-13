import os
from openai import AsyncOpenAI
from anthropic import AsyncAnthropic
from dotenv import load_dotenv

load_dotenv()

def get_openai_client(model_name: str = "gpt-4o-mini"):
    if model_name and "gemini" in model_name.lower():
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return AsyncOpenAI(api_key="none", base_url="https://generativelanguage.googleapis.com/v1beta/openai/")
        return AsyncOpenAI(api_key=api_key, base_url="https://generativelanguage.googleapis.com/v1beta/openai/")
    else:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return None
        return AsyncOpenAI(api_key=api_key)

def get_anthropic_client():
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    return AsyncAnthropic(api_key=api_key)
