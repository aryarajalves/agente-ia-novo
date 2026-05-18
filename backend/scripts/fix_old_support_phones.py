import asyncio
import os
import sys
from sqlalchemy import select, text

# Ajustando sys.path para permitir a importação dos módulos do backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import async_session
from models import SupportRequestModel, WebhookConfigModel

async def fix_phones():
    print("🔄 Iniciando correção retroativa de números de telefone em suportes humanos antigos...")
    async with async_session() as db:
        # 1. Buscar todos os webhooks para saber as tabelas de leads
        res_webhooks = await db.execute(select(WebhookConfigModel))
        webhooks = res_webhooks.scalars().all()
        
        # Mapeamento de webhook_id para nome da tabela de leads
        leads_tables = {}
        for w in webhooks:
            leads_tables[w.id] = w.leads_table or "leads"
            
        # Adicionar o padrão caso não esteja
        if not leads_tables:
            leads_tables[1] = "leads"
            
        # 2. Buscar suportes onde o telefone está curto (ex: IDs numéricos como "50", "1", etc)
        res_supports = await db.execute(
            select(SupportRequestModel)
            .where(SupportRequestModel.status != "RESOLVED")
        )
        supports = res_supports.scalars().all()
        
        updated_count = 0
        for req in supports:
            phone = req.contact_phone or ""
            session_id = req.session_id or ""
            
            # Se o telefone for curto e a sessão for numérica (indicando ID do lead)
            if (len(phone) < 6 or phone.isdigit()) and session_id.isdigit():
                lead_id = int(session_id)
                webhook_id = req.webhook_config_id or 1
                table_name = leads_tables.get(webhook_id, "leads")
                
                try:
                    # Buscar o telefone correspondente na tabela de leads
                    query = text(f"SELECT telefone, contato_nome FROM {table_name} WHERE id = :lead_id")
                    res_lead = await db.execute(query, {"lead_id": lead_id})
                    lead_row = res_lead.fetchone()
                    
                    if lead_row:
                        real_phone = lead_row[0]
                        real_name = lead_row[1]
                        
                        if real_phone:
                            req.contact_phone = real_phone
                            if real_name and req.user_name == "Usuário Chatwoot":
                                req.user_name = real_name
                                
                            print(f"✅ Suporte ID {req.id}: Atualizado telefone do lead '{real_name}' para {real_phone} (Lead ID: {lead_id})")
                            updated_count += 1
                except Exception as e:
                    print(f"⚠️ Erro ao buscar lead ID {lead_id} na tabela '{table_name}': {e}")
                    
        if updated_count > 0:
            await db.commit()
            print(f"🎉 Sucesso! {updated_count} solicitações de suporte corrigidas no banco de dados!")
        else:
            print("ℹ️ Nenhuma solicitação de suporte antiga precisou de correção.")

if __name__ == "__main__":
    asyncio.run(fix_phones())
