import os
import openai
from dotenv import load_dotenv

load_dotenv()

async def call_rag_llm(messages: list, model: str = "gpt-4o-mini", fallback: str = None, response_format: dict = None, max_tokens: int = 500):
    """Helper to call LLM with fallback logic for RAG background tasks."""
    
    # Try 1: Configured Simple Model
    # Try 2: Configured Fallback
    # Try 3: GPT-4o-mini (Safety net)
    models_to_try = [model, fallback, "gpt-4o-mini"]
    
    last_error = None
    for m in models_to_try:
        if not m: continue
        
        # Deferred imports to avoid circular dependency
        from agent import get_openai_client
        from config_store import get_real_model_id
        
        client = get_openai_client(m)
        api_model = get_real_model_id(m)
        
        if not client: continue

        try:
            from config_store import format_ai_params
            
            base_params = {
                "messages": messages,
                "temperature": 0.0,
                "max_tokens": max_tokens
            }
            if response_format:
                base_params["response_format"] = response_format
                
            kwargs = format_ai_params(api_model, m, base_params)
            
            response = await client.chat.completions.create(**kwargs)
            return response
        except Exception as e:
            print(f"[RAG LLM ERROR] Model {m} failed: {e}")
            last_error = e
            continue
            
    if last_error:
        raise last_error
    else:
        raise Exception("Todos os modelos RAG falharam ou chaves não configuradas")

class EmbeddingGenerationError(Exception):
    """Levantado quando não é possível gerar o vetor (embedding) de um texto."""
    pass

async def get_embedding(text: str):
    """Generates embedding for the given text using OpenAI.

    Levanta EmbeddingGenerationError em caso de falha (chave ausente/inválida,
    erro de rede, quota excedida, etc.) em vez de falhar silenciosamente —
    os endpoints que chamam esta função devem tratar o erro e recusar salvar
    o item sem vetor.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise EmbeddingGenerationError("OPENAI_API_KEY não configurada no servidor.")

    try:
        client = openai.AsyncOpenAI(api_key=api_key)

        # Replace newlines
        text = text.replace("\n", " ")

        response = await client.embeddings.create(
            input=[text],
            model="text-embedding-3-small"
        )

        return response.data[0].embedding, response.usage

    except Exception as e:
        print(f"Error generating embedding: {e}")
        raise EmbeddingGenerationError(f"Falha ao gerar embedding: {e}") from e

async def get_batch_embeddings(texts: list[str]):
    """Generates embeddings for a list of texts in a single batch call using OpenAI."""
    try:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return [], None
            
        client = openai.AsyncOpenAI(api_key=api_key)
        
        # Replace newlines in all texts
        cleaned_texts = [t.replace("\n", " ") for t in texts]
        
        response = await client.embeddings.create(
            input=cleaned_texts,
            model="text-embedding-3-small"
        )
        
        embeddings = [item.embedding for item in response.data]
        return embeddings, response.usage
        
    except Exception as e:
        print(f"Error generating batch embeddings: {e}")
        return [], None
