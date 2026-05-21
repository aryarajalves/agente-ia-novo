import asyncio
import json
import sys
import os

# Adiciona o diretório atual do script ao path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import engine
from webhooks.service import ensure_leads_table

async def run_seeder():
    print("Garantindo que a tabela leads existe...")
    await ensure_leads_table("leads")
    
    print("Limpando leads antigos na tabela principal...")
    async with engine.begin() as conn:
        await conn.execute(text("DELETE FROM leads"))
    
    print("Inserindo leads de teste (Quente, Morno, Frio)...")
    
    # Lead Quente
    respostas_quente = [
        {"question": "Qual seu objetivo principal?", "answer": "Escalar minha agência para 50k/mês"},
        {"question": "Tem orçamento para investir?", "answer": "Sim, tenho mais de 10k"}
    ]
    
    # Lead Morno
    respostas_morno = [
        {"question": "Qual seu objetivo principal?", "answer": "Criar novas automações de IA"},
        {"question": "Tem orçamento para investir?", "answer": "Cerca de 3k a 5k"}
    ]
    
    # Lead Frio
    respostas_frio = [
        {"question": "Qual seu objetivo principal?", "answer": "Aprender lógica de programação"},
        {"question": "Tem orçamento para investir?", "answer": "Sem orçamento no momento"}
    ]
    
    async with engine.begin() as conn:
        # Inserir Lead Quente 🔥
        await conn.execute(text("""
            INSERT INTO leads (
                webhook_config_id, conta_id, inbox_id, inbox_nome, conversa_id, contato_id,
                telefone, contato_nome, respostas_qualificacao, lead_score,
                lead_classification, lead_justification, created_at, updated_at
            ) VALUES (
                1, '1', '1', 'WhatsApp Direct', '100', '200',
                '+5511999998888', 'Aryaraj Alves', :resp_quente, 13,
                'Quente 🔥', 'Excelente perfil. Já fatura alto e tem orçamento compatível com a mentoria high-ticket.',
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
        """), {"resp_quente": json.dumps(respostas_quente)})
        
        # Inserir Lead Morno ⚡
        await conn.execute(text("""
            INSERT INTO leads (
                webhook_config_id, conta_id, inbox_id, inbox_nome, conversa_id, contato_id,
                telefone, contato_nome, respostas_qualificacao, lead_score,
                lead_classification, lead_justification, created_at, updated_at
            ) VALUES (
                1, '1', '1', 'WhatsApp Direct', '101', '201',
                '+5511988887777', 'Carlos Silva', :resp_morno, 8,
                'Morno ⚡', 'Interessado na mentoria, porém o orçamento está abaixo do valor cheio de 10k. Pode precisar de parcelamento ou oferta intermediária.',
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
        """), {"resp_morno": json.dumps(respostas_morno)})
        
        # Inserir Lead Frio ❄️
        await conn.execute(text("""
            INSERT INTO leads (
                webhook_config_id, conta_id, inbox_id, inbox_nome, conversa_id, contato_id,
                telefone, contato_nome, respostas_qualificacao, lead_score,
                lead_classification, lead_justification, created_at, updated_at
            ) VALUES (
                1, '1', '1', 'WhatsApp Direct', '102', '202',
                '+5511977776666', 'José Santos', :resp_frio, 2,
                'Frio ❄️', 'Estudante iniciante sem orçamento para mentoria high-ticket no momento.',
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
        """), {"resp_frio": json.dumps(respostas_frio)})
        
    print("Leads de teste inseridos com sucesso!")

if __name__ == "__main__":
    asyncio.run(run_seeder())
