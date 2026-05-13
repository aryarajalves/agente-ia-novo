import re
import json
from typing import Any, Optional, Dict

def get_value_by_path(data: Dict[str, Any], path: str) -> Any:
    """Extrai valores de dicionários aninhados usando notação de ponto (ex: 'sender.name')."""
    if not path: return None
    keys = path.split('.')
    val = data
    for k in keys:
        if isinstance(val, dict) and k in val:
            val = val[k]
        else:
            return None
    return val

def flatten_dict(d: Dict[str, Any], parent_key: str = '', sep: str = '.') -> Dict[str, Any]:
    """Transforma um dicionário aninhado em um dicionário plano com chaves compostas."""
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        elif isinstance(v, list):
            if v and isinstance(v[0], (dict, list)):
                 items.append((new_key, json.dumps(v, ensure_ascii=False)))
            else:
                 items.append((new_key, str(v)))
        else:
            items.append((new_key, v))
    return dict(items)

def sanitize_table_name(name: str) -> str:
    """Garante que o nome da tabela seja seguro para o PostgreSQL."""
    clean = re.sub(r'[^a-z0-9_]', '_', name.lower().strip())
    if not clean or not clean[0].isalpha():
        clean = 'leads_' + clean
    # Limitação de tamanho do Postgres (63 caracteres)
    return clean[:63]

def normalize_phone(phone_raw: Any) -> str:
    """Remove caracteres não numéricos e lida com falhas básicas."""
    if phone_raw is None:
        return ""
    phone_str = str(phone_raw)
    phone_clean = re.sub(r'\D', '', phone_str)
    return phone_clean if phone_clean else phone_str

def get_phone_suffix(phone: str, length: int = 8) -> str:
    """Retorna os últimos N dígitos do telefone para comparação de nono dígito."""
    digits = normalize_phone(phone)
    return digits[-length:] if len(digits) >= length else digits
