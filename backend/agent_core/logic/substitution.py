import re

def resolve_conditional_blocks(text: str, context_variables: dict) -> str:
    """Processa blocos [IF:cond]...[ELIF:cond]...[ELSE]...[/IF] no prompt."""
    def get_var_value(name, context):
        if not context: return None
        name_lower = name.strip().lower()
        for k, v in context.items():
            if k.lower() == name_lower:
                return v
        return None

    def evaluate_condition(condition):
        condition = condition.strip()
        operators = [">=", "<=", "==", "!=", ">", "<"]
        for op in operators:
            if op in condition:
                parts = condition.split(op)
                v1_raw, v2_raw = parts[0].strip(), parts[1].strip()
                v1_val = get_var_value(v1_raw, context_variables)
                v2_val = get_var_value(v2_raw, context_variables)
                try: val1 = float(v1_val) if v1_val is not None else float(v1_raw)
                except: val1 = 0.0
                try: val2 = float(v2_val) if v2_val is not None else float(v2_raw)
                except: val2 = 0.0
                if op == ">": return val1 > val2
                if op == "<": return val1 < val2
                if op == ">=": return val1 >= val2
                if op == "<=": return val1 <= val2
                if op == "==": return val1 == val2
                if op == "!=": return val1 != val2
        
        parts = condition.split(":", 1)
        var_name = parts[0].strip()
        expect_false = len(parts) > 1 and parts[1].strip().lower() == "false"
        val = get_var_value(var_name, context_variables)
        raw_value = str(val or "").strip().lower()
        is_truthy = raw_value in ("true", "1", "sim", "yes")

        if not is_truthy and "contato_criado_" in var_name.lower():
            try:
                days_threshold = int(var_name.split("_")[-1])
                dias_reais = (context_variables or {}).get("dias_desde_criacao")
                if dias_reais is None:
                    val_bool = get_var_value(var_name, context_variables)
                    if val_bool is not None:
                        is_truthy = str(val_bool).strip().lower() in ("true", "1", "sim", "yes")
                        return not is_truthy if expect_false else is_truthy
                dias_reais = int(dias_reais or 0)
                if "ha_mais_de_" in var_name.lower(): is_truthy = dias_reais > days_threshold
                elif "ha_menos_de_" in var_name.lower(): is_truthy = dias_reais < days_threshold
                elif "exatamente_ha_" in var_name.lower(): is_truthy = dias_reais == days_threshold
            except: pass
        return not is_truthy if expect_false else is_truthy

    def process_full_if_block(match):
        full_content = match.group(0)
        first_tag_match = re.match(r'\[IF:([^\]]+)\]', full_content, re.IGNORECASE)
        if not first_tag_match: return ""
        initial_condition = first_tag_match.group(1)
        inner_body = full_content[first_tag_match.end():-5].strip()
        dividers = list(re.finditer(r'\[(ELIF:([^\]]+)|ELSE)\]', inner_body, re.IGNORECASE))
        branches = []
        if dividers:
            branches.append((initial_condition, inner_body[:dividers[0].start()].strip()))
            for i in range(len(dividers)):
                current_div = dividers[i]
                next_pos = dividers[i+1].start() if i+1 < len(dividers) else len(inner_body)
                tag = current_div.group(1).upper()
                content = inner_body[current_div.end():next_pos].strip()
                if tag.startswith("ELIF:"): branches.append((current_div.group(2), content))
                elif tag == "ELSE": branches.append((None, content))
        else: branches.append((initial_condition, inner_body))

        for cond, content in branches:
            if cond is None or evaluate_condition(cond): return content
        return ""

    return re.sub(r'\[IF:([^\]]+)\].*?\[/IF\]', process_full_if_block, text, flags=re.DOTALL | re.IGNORECASE)
