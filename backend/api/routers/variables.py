import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models import GlobalContextVariableModel
from api.schemas import GlobalContextVariable
from api.deps import get_db, verify_api_key

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Variables"])

@router.get("/settings/public-tokens")
async def get_public_tokens(db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    """Busca tokens de acesso público (usados no widget de suporte)."""
    result = await db.execute(
        select(GlobalContextVariableModel).where(GlobalContextVariableModel.key.like('PUBLIC_ACCESS_TOKEN_%'))
    )
    vars = result.scalars().all()
    return {v.key: v.value for v in vars}

@router.get("/global-variables", response_model=List[GlobalContextVariable])
async def list_global_variables(db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    """Lista todas as variáveis globais de contexto (usadas no processamento de mensagens)."""
    result = await db.execute(
        select(GlobalContextVariableModel)
        .order_by(GlobalContextVariableModel.is_default.desc(), GlobalContextVariableModel.key)
    )
    variables = result.scalars().all()
    
    # Inicialização automática se estiver vazio (fallback seguro)
    if not variables:
        defaults = [
            {"key": "contact_name", "value": "Usuário Teste", "description": "Nome do contato para personalização.", "is_default": True},
            {"key": "contact_phone", "value": "5511999999999", "description": "Telefone do contato.", "is_default": True}
        ]
        for d in defaults:
            db.add(GlobalContextVariableModel(**d))
        await db.commit()
        result = await db.execute(
            select(GlobalContextVariableModel)
            .order_by(GlobalContextVariableModel.is_default.desc(), GlobalContextVariableModel.key)
        )
        variables = result.scalars().all()
        
    return variables

@router.post("/global-variables", response_model=GlobalContextVariable)
async def create_global_variable(
    variable: GlobalContextVariable, 
    db: AsyncSession = Depends(get_db), 
    _: None = Depends(verify_api_key)
):
    """Cria uma nova variável global customizada."""
    db_var = GlobalContextVariableModel(
        key=variable.key,
        value=variable.value,
        type=variable.type or "string",
        description=variable.description,
        extraction_method=variable.extraction_method or "integration",
        extraction_prompt=variable.extraction_prompt,
        is_default=False
    )
    db.add(db_var)
    try:
        await db.commit()
        await db.refresh(db_var)
        return db_var
    except Exception as e:
        await db.rollback()
        if "unique" in str(e).lower() or "duplicate" in str(e).lower():
            raise HTTPException(status_code=400, detail=f"A chave '{variable.key}' já existe.")
        raise HTTPException(status_code=400, detail=f"Erro ao salvar variável: {str(e)}")

@router.put("/global-variables/{var_id}", response_model=GlobalContextVariable)
async def update_global_variable(
    var_id: int, 
    variable: GlobalContextVariable, 
    db: AsyncSession = Depends(get_db), 
    _: None = Depends(verify_api_key)
):
    """Atualiza o valor ou descrição de uma variável global."""
    db_var = await db.get(GlobalContextVariableModel, var_id)
    if not db_var:
        raise HTTPException(status_code=404, detail="Variável não encontrada")
    
    db_var.value = variable.value
    db_var.description = variable.description
    db_var.type = variable.type or "string"
    db_var.extraction_method = variable.extraction_method or "integration"
    db_var.extraction_prompt = variable.extraction_prompt
    
    # Só permite mudar a chave se não for uma variável padrão do sistema
    if not db_var.is_default:
        db_var.key = variable.key
        
    await db.commit()
    await db.refresh(db_var)
    return db_var


@router.put("/global-variables/key/{key}")
async def update_variable_by_key(
    key: str, 
    data: dict, 
    db: AsyncSession = Depends(get_db), 
    _: None = Depends(verify_api_key)
):
    """Atualiza ou cria uma variável global diretamente pelo nome da chave (útil para automações)."""
    res = await db.execute(select(GlobalContextVariableModel).where(GlobalContextVariableModel.key == key))
    var = res.scalar_one_or_none()
    
    val = data.get("value")
    if val is None:
        raise HTTPException(status_code=400, detail="O campo 'value' é obrigatório.")

    if not var:
        var = GlobalContextVariableModel(
            key=key, 
            value=str(val), 
            type="string",
            description=f"Variável gerada via API: {key}"
        )
        db.add(var)
    else:
        var.value = str(val)
    
    await db.commit()
    return {"status": "ok", "key": key, "value": var.value}

@router.delete("/global-variables/{var_id}")
async def delete_global_variable(var_id: int, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    """Remove uma variável global customizada (variáveis padrão não podem ser removidas)."""
    db_var = await db.get(GlobalContextVariableModel, var_id)
    if not db_var:
        raise HTTPException(status_code=404, detail="Variável não encontrada")
    if db_var.is_default:
        raise HTTPException(status_code=400, detail="Variáveis padrão do sistema não podem ser deletadas.")
    
    await db.delete(db_var)
    await db.commit()
    return {"status": "success", "message": "Variável deletada"}
