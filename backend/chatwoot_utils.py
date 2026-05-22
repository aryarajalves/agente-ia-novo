import httpx
import logging
import json
import os

logger = logging.getLogger(__name__)

CHATWOOT_URL_DEFAULT = os.getenv("CHATWOOT_URL", "")
CHATWOOT_TOKEN_DEFAULT = os.getenv("CHATWOOT_API_TOKEN", "")

async def sync_conversation_labels(cw_url: str, account_id: int, conversation_id: int, token: str, to_add: list = None, to_remove: list = None):
    """
    Sincroniza as etiquetas de uma conversa no Chatwoot de forma idempotente.
    Retorna uma tupla (sucesso: bool, etiquetas_finais: list)
    """
    if not cw_url or not account_id or not conversation_id or not token:
        logger.warning(f"Dados insuficientes para sincronizar etiquetas Chatwoot: url={cw_url}, acc={account_id}, conv={conversation_id}")
        return False, []

    cw_url = cw_url.rstrip("/")
    to_add = to_add or []
    to_remove = to_remove or []

    labels_url = f"{cw_url}/api/v1/accounts/{account_id}/conversations/{conversation_id}/labels"
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            # 1. Buscar etiquetas atuais
            cur_resp = await client.get(labels_url, headers={"api_access_token": token})
            current_labels = []
            if cur_resp.status_code == 200:
                current_labels = cur_resp.json().get("payload", [])
            
            # 2. Calcular novo conjunto de etiquetas
            final_labels = [l for l in current_labels if l not in to_remove]
            for l in to_add:
                if l not in final_labels:
                    final_labels.append(l)
            
            # 3. Se não houver mudança e nem to_add/to_remove vazios pendentes, pula o POST
            if not to_add and not to_remove:
                return True, current_labels

            if set(final_labels) == set(current_labels):
                logger.info(f"✅ Etiquetas já sincronizadas para conversa {conversation_id}")
                return True, final_labels
                
            # 4. Atualizar no Chatwoot
            update_resp = await client.post(labels_url, json={"labels": final_labels}, headers={"api_access_token": token})
            if update_resp.status_code == 200:
                logger.info(f"🏷️ Etiquetas sincronizadas para conversa {conversation_id}: +{to_add} -{to_remove}")
                return True, final_labels
            else:
                logger.error(f"❌ Erro ao atualizar etiquetas: {update_resp.status_code} - {update_resp.text}")
                return False, current_labels
                
    except Exception as e:
        logger.error(f"⚠️ Exceção ao sincronizar etiquetas Chatwoot: {e}")
        return False, []

async def is_conversation_paused(cw_url: str, account_id: int, conversation_id: int, token: str, ignore_label: str) -> bool:
    """
    Verifica se uma conversa deve ser ignorada baseada em uma etiqueta de pausa.
    Retorna True se a etiqueta estiver presente, False caso contrário.
    """
    if not cw_url or not account_id or not conversation_id or not token or not ignore_label:
        return False
        
    labels_url = f"{cw_url.rstrip('/')}/api/v1/accounts/{account_id}/conversations/{conversation_id}/labels"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(labels_url, headers={"api_access_token": token})
            if resp.status_code == 200:
                current_labels = resp.json().get("payload", [])
                # Comparação case-insensitive
                return any(l.lower() == ignore_label.lower().strip() for l in current_labels if isinstance(l, str))
            else:
                logger.warning(f"⚠️ Falha ao buscar etiquetas (Status {resp.status_code}) para verificar pausa na conversa {conversation_id}")
    except Exception as e:
        logger.error(f"⚠️ Erro ao verificar etiquetas para ignorar: {e}")
    return False

async def send_chatwoot_message(cw_url: str, account_id: int, conversation_id: int, token: str, content: str):
    """Envia uma mensagem para uma conversa no Chatwoot."""
    if not cw_url or not account_id or not conversation_id or not token or not content:
        return False
    url = f"{cw_url.rstrip('/')}/api/v1/accounts/{account_id}/conversations/{conversation_id}/messages"
    headers = {"api_access_token": token, "Content-Type": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json={"content": content, "message_type": "outgoing"}, headers=headers)
            return resp.status_code in (200, 201)
    except Exception as e:
        logger.error(f"Erro ao enviar mensagem Chatwoot: {e}")
        return False


def get_conversation_labels_sync(cw_url: str, account_id: int, conversation_id: int, token: str) -> list:
    """
    Busca as etiquetas de uma conversa de forma síncrona no Chatwoot.
    Retorna a lista de etiquetas se a chamada for bem-sucedida.
    Retorna None em caso de falha de conexão ou status diferente de 200 para evitar sobrescrever dados locais.
    """
    if not cw_url or not account_id or not conversation_id or not token:
        logger.warning("Parâmetros inválidos para obter etiquetas síncronas")
        return None
    url = f"{cw_url.rstrip('/')}/api/v1/accounts/{account_id}/conversations/{conversation_id}/labels"
    headers = {"api_access_token": token}
    try:
        with httpx.Client(timeout=10) as client:
            resp = client.get(url, headers=headers)
            if resp.status_code == 200:
                return resp.json().get("payload", [])
            else:
                logger.error(f"Erro ao obter etiquetas do Chatwoot síncronamente (Status {resp.status_code}): {resp.text}")
                return None
    except Exception as e:
        logger.error(f"Exceção ao obter etiquetas do Chatwoot síncronamente: {e}")
        return None

