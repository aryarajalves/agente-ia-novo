import asyncio
import os
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select

# Set up local DATABASE_URL
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///backend/database.db"
from backend.database import DATABASE_URL
from backend.models import Base, AgentConfigModel, InteractionLog, UserModel

async def main():
    engine = create_async_engine(DATABASE_URL)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # 1. Check/Create Admin User
        admin_email = "aryarajmarketing@gmail.com"
        result_user = await session.execute(select(UserModel).where(UserModel.email == admin_email))
        user = result_user.scalar_one_or_none()
        if not user:
            print("Creating Admin User...")
            user = UserModel(
                name="Aryaraj",
                email=admin_email,
                password="123456",  # mantido simples
                role="Admin",
                status="ATIVO"
            )
            session.add(user)
        else:
            print("Admin User already exists.")
            
        # 2. Check/Create Agents
        agents_data = [
            {"id": 1, "name": "Agente - Novo - Tarcira (gpt-5.2)", "model": "gpt-5.2"},
            {"id": 2, "name": "Agente - Novo - Tarcira (Resposta Automática)", "model": "shortcut-logic"},
        ]
        
        for ag in agents_data:
            result_ag = await session.execute(select(AgentConfigModel).where(AgentConfigModel.id == ag["id"]))
            agent = result_ag.scalar_one_or_none()
            if not agent:
                print(f"Creating Agent: {ag['name']}")
                agent = AgentConfigModel(
                    id=ag["id"],
                    name=ag["name"],
                    model=ag["model"],
                    is_active=True
                )
                session.add(agent)
            else:
                print(f"Agent already exists: {ag['name']}")
                
        await session.commit()
        
        # 3. Create Interaction Logs
        # Clear existing logs first to have clean test data
        from sqlalchemy import delete
        await session.execute(delete(InteractionLog))
        await session.commit()
        
        print("Populating interaction logs...")
        
        today = datetime.now(timezone.utc)
        yesterday = today - timedelta(days=1)
        two_days_ago = today - timedelta(days=2)
        three_days_ago = today - timedelta(days=3)
        
        # Data format: (agent_id, model, cost_brl, tokens, session_id, timestamp)
        logs = [
            # Today: some active and some zero cost
            (1, "gpt-5.2", 4.0612, 124729, "sess_1", today),
            (1, "gpt-5.2", 0.0078, 500, "sess_2", today),
            (2, "shortcut-logic", 0.0, 0, "sess_3", today), # zero cost
            
            # Yesterday: active and zero
            (1, "gpt-5.2", 15.9194, 427806, "sess_4", yesterday),
            (1, "gpt-5.2", 0.0212, 10867, "sess_5", yesterday),
            (2, "shortcut-logic", 0.0, 0, "sess_6", yesterday), # zero cost
            
            # 2 days ago: active and zero
            (1, "gpt-5.2", 11.0001, 296460, "sess_7", two_days_ago),
            (1, "gpt-5.2", 0.0223, 8203, "sess_8", two_days_ago),
            (2, "shortcut-logic", 0.0, 0, "sess_9", two_days_ago), # zero cost
            
            # 3 days ago: active
            (1, "gpt-5.2", 9.3742, 248746, "sess_10", three_days_ago),
            (1, "gpt-5.2", 0.0135, 7035, "sess_11", three_days_ago),
        ]
        
        for agent_id, model, cost, tokens, sess_id, ts in logs:
            log = InteractionLog(
                agent_id=agent_id,
                session_id=sess_id,
                user_message="Mensagem de teste",
                agent_response="Resposta de teste",
                model_used=model,
                input_tokens=tokens // 2,
                output_tokens=tokens // 2,
                cost_usd=cost / 5.0,  # Approximate USD cost
                cost_brl=cost,
                timestamp=ts
            )
            session.add(log)
            
        await session.commit()
        print("Database seeded successfully with financial test data!")

if __name__ == "__main__":
    asyncio.run(main())
