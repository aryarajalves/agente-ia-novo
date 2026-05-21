import re
import logging
from .clients import get_openai_client

def verify_output_safety(text: str, config) -> str:
    if not text: return text
    blacklist = getattr(config, 'security_competitor_blacklist', None)
    if blacklist:
        items = [i.strip() for i in blacklist.split(',') if i.strip()]
        if items:
            pattern = re.compile(r'\b(' + '|'.join(map(re.escape, items)) + r')\b', re.IGNORECASE)
            text = pattern.sub("[CONCORRENTE BLOQUEADO]", text)
    forbidden = getattr(config, 'security_forbidden_topics', None)
    if forbidden:
        items = [i.strip() for i in forbidden.split(',') if i.strip()]
        if items:
            pattern = re.compile(r'\b(' + '|'.join(map(re.escape, items)) + r')\b', re.IGNORECASE)
            text = pattern.sub("[TOPICO BLOQUEADO]", text)
    if getattr(config, 'security_pii_filter', False):
        text = re.sub(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', "[EMAIL OCULTO]", text)
        text = re.sub(r'\d{3}\.\d{3}\.\d{3}-\d{2}', "[CPF OCULTO]", text)
        text = re.sub(r'\(?\d{2}\)?\s?\d{4,5}-\d{4}', "[TELEFONE OCULTO]", text)
    return text

async def validate_response_ai(text: str, config) -> dict:
    logger = logging.getLogger(__name__)
    if not text: return {"is_safe": True, "reason": None}
    protocols = []
    if getattr(config, 'security_competitor_blacklist', None): protocols.append(f"- Proibido citar: {config.security_competitor_blacklist}")
    if getattr(config, 'security_forbidden_topics', None): protocols.append(f"- Proibido falar de: {config.security_forbidden_topics}")
    if getattr(config, 'security_discount_policy', None): protocols.append(f"- Política de Descontos: {config.security_discount_policy}")
    if not protocols: return {"is_safe": True, "reason": None}
    
    prompt = f"AUDITOR DE SEGURANÇA:\n{chr(10).join(protocols)}\nAUDITAR: \"{text}\"\nResponda APENAS: 'VIOLATION: [motivo]' ou 'SAFE'."
    
    # Lista de modelos para tentar em sequencia
    models_to_try = []
    simple_model = getattr(config, 'router_simple_model', None)
    if simple_model:
        models_to_try.append(simple_model)
    simple_fallback = getattr(config, 'router_simple_fallback_model', None)
    if simple_fallback:
        models_to_try.append(simple_fallback)
    if "gpt-4o-mini" not in models_to_try:
        models_to_try.append("gpt-4o-mini")
        
    for model_name in models_to_try:
        try:
            logger.info(f"Tentando validar seguranca da resposta com o modelo: {model_name}")
            client = get_openai_client(model_name)
            if not client:
                logger.warning(f"Cliente OpenAI nao configurado para o modelo: {model_name}")
                continue
            response = await client.chat.completions.create(
                model=model_name,
                messages=[{"role": "system", "content": prompt}],
                temperature=0.0,
                max_tokens=50
            )
            audit_result = response.choices[0].message.content.strip()
            logger.info(f"Resultado do auditor ({model_name}): {audit_result}")
            if audit_result.startswith("VIOLATION"):
                return {"is_safe": False, "reason": audit_result.replace("VIOLATION:", "").strip()}
            return {"is_safe": True, "reason": None}
        except Exception as e:
            logger.error(f"Erro na auditoria com o modelo {model_name}: {str(e)}")
            continue
            
    logger.warning("Todos os modelos de auditoria de IA falharam. Mantendo a resposta como segura (fail-safe).")
    return {"is_safe": True, "reason": "Todos os modelos de auditoria falharam"}
