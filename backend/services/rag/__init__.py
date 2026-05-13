from .core import search_knowledge_base, calculate_coverage
from .providers import call_rag_llm, get_embedding, get_batch_embeddings
from .language import (
    detect_language, 
    translate_to_portuguese, 
    detect_message_language, 
    translate_to_language,
    LANG_MAP
)
from .agentic import (
    rerank_results, 
    evaluate_rag_relevance, 
    generate_multi_queries
)

__all__ = [
    'search_knowledge_base',
    'calculate_coverage',
    'call_rag_llm',
    'get_embedding',
    'get_batch_embeddings',
    'detect_language',
    'translate_to_portuguese',
    'detect_message_language',
    'translate_to_language',
    'LANG_MAP',
    'rerank_results',
    'evaluate_rag_relevance',
    'generate_multi_queries'
]
