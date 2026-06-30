import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import UserMemoryModel
from .clients import get_openai_client

async def fetch_user_memory(db, session_id: str) -> str:
    if not db or not session_id: return ""
    try:
        from sqlalchemy.ext.asyncio import AsyncSession
        stmt = select(UserMemoryModel).where(UserMemoryModel.session_id == session_id).order_by(UserMemoryModel.updated_at.desc())
        if isinstance(db, AsyncSession):
            result = await db.execute(stmt)
        else:
            result = db.execute(stmt)
        memories = result.scalars().all()
        if not memories: return ""
        
        # Cria a lista de fatos estruturados
        facts_list = [f"{m.key}: {m.value}" for m in memories]
        facts_str = "\n".join(facts_list)
        
        # Gera o resumo usando OpenAI/GPT
        client = get_openai_client()
        if client:
            summary_prompt = (
                "Você é um assistente de síntese. Abaixo estão fatos extraídos de conversas anteriores com o usuário. "
                "Gere um resumo compacto e fluido (máximo de 3 frases) em Português consolidando esses pontos principais, "
                "para que o agente entenda o contexto geral do perfil/histórico do usuário.\n\n"
                f"Fatos na Memória:\n{facts_str}"
            )
            res_summary = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "Gere resumos compactos, claros e objetivos em português."},
                    {"role": "user", "content": summary_prompt}
                ],
                temperature=0.3
            )
            summary_text = res_summary.choices[0].message.content.strip()
            return f"\n# RESUMO DAS MEMÓRIAS DO USUÁRIO:\n{summary_text}\n"
        
        facts_text = "\n# MEMÓRIA ESTRUTURADA:\n"
        for i, m in enumerate(memories):
            prefix = "⭐ [PRIORITÁRIO]" if i == 0 else "-"
            facts_text += f"{prefix} {m.key}: {m.value}\n"
        return facts_text
    except Exception as e:
        print(f"⚠️ fetch_user_memory error: {e}")
        return ""

async def update_user_memory(db, session_id: str, new_message: str, response_text: str):
    if not db or not session_id or not new_message: return
    client = get_openai_client()
    if not client: return
    
    # 1. Carregar variáveis globais configuradas para extração por IA do banco de dados
    from models import GlobalContextVariableModel
    try:
        stmt_vars = select(GlobalContextVariableModel).where(GlobalContextVariableModel.extraction_method == "ai")
        if isinstance(db, AsyncSession):
            res_vars = await db.execute(stmt_vars)
        else:
            res_vars = db.execute(stmt_vars)
        ai_variables = res_vars.scalars().all()
    except Exception as e_vars:
        print(f"⚠️ Erro ao carregar variáveis para extração em update_user_memory: {e_vars}")
        ai_variables = []

    # Se houver variáveis para extração com IA, montamos a especificação estruturada no prompt
    variables_spec = ""
    for v in ai_variables:
        variables_spec += f"- Chave: '{v.key}' (Tipo: {v.type})\n  Regra de Extração: {v.extraction_prompt or 'Extrair esta informação do diálogo se mencionada.'}\n\n"
        
    prompt = (
        f"Você é um assistente de extração de dados estruturados focado em atualizar o perfil do cliente a partir do diálogo.\n"
        f"Analise o diálogo abaixo e extraia as informações correspondentes.\n\n"
        f"Diálogo:\n"
        f"Usuário: {new_message}\n"
        f"Agente: {response_text}\n\n"
    )
    
    if ai_variables:
        prompt += (
            f"### VARIÁVEIS A EXTRAIR:\n"
            f"{variables_spec}"
            f"Instruções:\n"
            f"1. Para cada variável listada acima, tente extrair o valor com base em sua respectiva Regra de Extração.\n"
            f"2. Se não houver informação suficiente no diálogo para preencher a variável, ou se a informação não foi mencionada, retorne null para aquela chave.\n"
            f"3. Retorne também uma chave 'fatos_gerais' contendo uma lista de outros fatos importantes extraídos que não se encaixam nas variáveis acima.\n"
            f"Retorne APENAS um JSON plano contendo as chaves das variáveis especificadas (com seus respectivos valores extraídos ou null) e a chave 'fatos_gerais'.\n"
        )
    else:
        prompt += (
            "Extraia fatos estruturados importantes do diálogo:\n"
            "Retorne JSON plano contendo fatos gerais importantes identificados como chaves e valores."
        )

    try:
        res = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Você é um extrator de dados estruturados. Retorne exclusivamente um objeto JSON plano de acordo com as instruções."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}, 
            temperature=0
        )
        data = json.loads(res.choices[0].message.content)
        if not data: return
        
        # Separar fatos gerais de variáveis mapeadas
        fatos_gerais = {}
        if "fatos_gerais" in data:
            fg = data.pop("fatos_gerais")
            if isinstance(fg, dict):
                fatos_gerais = fg
            elif isinstance(fg, list):
                for idx, fato in enumerate(fg):
                    fatos_gerais[f"fato_extraido_{idx}"] = fato
        
        # Junta todas as extrações
        facts_to_save = {}
        # Primeiramente adicionamos fatos gerais
        for k, v in fatos_gerais.items():
            facts_to_save[k] = v
        # Depois adicionamos as variáveis mapeadas (somente se não forem nulas/vazias)
        for k, v in data.items():
            if v is not None and str(v).strip() != "":
                facts_to_save[k] = v
                
        if not facts_to_save: return

        for key, value in facts_to_save.items():
            stmt = select(UserMemoryModel).where(UserMemoryModel.session_id == str(session_id), UserMemoryModel.key == key)
            if isinstance(db, AsyncSession):
                existing_res = await db.execute(stmt)
            else:
                existing_res = db.execute(stmt)
            existing = existing_res.scalars().first()
            if existing:
                existing.value = str(value)
                existing.source_message = new_message
            else:
                db.add(UserMemoryModel(session_id=str(session_id), key=key, value=str(value), source_message=new_message))
        
        if isinstance(db, AsyncSession):
            await db.commit()
        else:
            db.commit()
            
    except Exception as e:
        print(f"⚠️ update_user_memory error: {e}")


async def delete_all_user_memory(db, session_id: str):
    """Remove toda a memória do usuário (ex: após transbordo completo)."""
    if not db or not session_id: return
    try:
        from sqlalchemy import delete
        from sqlalchemy.ext.asyncio import AsyncSession
        stmt = delete(UserMemoryModel).where(UserMemoryModel.session_id == session_id)
        if isinstance(db, AsyncSession):
            await db.execute(stmt)
            await db.commit()
        else:
            db.execute(stmt)
            db.commit()
    except Exception as e:
        print(f"⚠️ delete_all_user_memory error: {e}")

async def delete_user_memory_by_keys(db, session_id: str, keys: list):
    """Remove chaves específicas da memória do usuário."""
    if not db or not session_id or not keys: return
    try:
        from sqlalchemy import delete
        from sqlalchemy.ext.asyncio import AsyncSession
        stmt = delete(UserMemoryModel).where(UserMemoryModel.session_id == session_id).where(UserMemoryModel.key.in_(keys))
        if isinstance(db, AsyncSession):
            await db.execute(stmt)
            await db.commit()
        else:
            db.execute(stmt)
            db.commit()
    except Exception as e:
        print(f"⚠️ delete_user_memory_by_keys error: {e}")
