import sys
import os
import json
from sqlalchemy import text, create_engine
from sqlalchemy.orm import sessionmaker

# Adiciona o diretório pai ao path para importar as configurações se necessário
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SYNC_DATABASE_URL

def clean_tools():
    print(f"🚀 Iniciando limpeza de ferramentas duplicadas...")
    engine = create_engine(SYNC_DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    
    try:
        # 1. Buscar todas as ferramentas
        result = session.execute(text("SELECT id, name, created_at FROM tools ORDER BY name, created_at DESC"))
        tools = result.fetchall()
        
        seen_names = {}
        to_delete = []
        
        for tool in tools:
            tool_id, name, created_at = tool
            if name not in seen_names:
                seen_names[name] = tool_id
                print(f"✅ Mantendo: {name} (ID: {tool_id})")
            else:
                to_delete.append(tool_id)
                print(f"🗑️ Marcando para deletar duplicata: {name} (ID: {tool_id})")
        
        if not to_delete:
            print("✨ Nenhuma ferramenta duplicada encontrada.")
            return

        # 2. Deletar duplicatas
        # Nota: Pode haver problemas de chave estrangeira se a ferramenta estiver vinculada a um agente.
        # Vamos verificar se essas ferramentas estão sendo usadas.
        
        for tool_id in to_delete:
            # Verifica se está em agent_tools
            usage = session.execute(text("SELECT COUNT(*) FROM agent_tools WHERE tool_id = :id"), {"id": tool_id}).scalar()
            if usage > 0:
                print(f"⚠️ Aviso: Ferramenta {tool_id} está em uso por {usage} agentes. Transferindo vínculos...")
                # Tenta transferir o vínculo para a ferramenta que mantivemos
                tool_name = session.execute(text("SELECT name FROM tools WHERE id = :id"), {"id": tool_id}).scalar()
                main_id = seen_names[tool_name]
                
                # Update agent_tools set tool_id = main_id where tool_id = tool_id
                # Mas precisamos evitar duplicatas no par (agent_id, tool_id)
                session.execute(text("""
                    UPDATE agent_tools 
                    SET tool_id = :main_id 
                    WHERE tool_id = :old_id 
                    AND NOT EXISTS (
                        SELECT 1 FROM agent_tools t2 
                        WHERE t2.agent_id = agent_tools.agent_id 
                        AND t2.tool_id = :main_id
                    )
                """), {"main_id": main_id, "old_id": tool_id})
                
                # Deleta os que sobraram (os que já tinham a ferramenta principal)
                session.execute(text("DELETE FROM agent_tools WHERE tool_id = :old_id"), {"old_id": tool_id})

            session.execute(text("DELETE FROM tools WHERE id = :id"), {"id": tool_id})
            print(f"✅ Deletada: {tool_id}")
            
        session.commit()
        print(f"🎉 Sucesso! {len(to_delete)} ferramentas duplicadas removidas.")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Erro durante a limpeza: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    clean_tools()
