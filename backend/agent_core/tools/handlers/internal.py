import json
from datetime import datetime
from ...clients import get_openai_client

async def handle_date_calculator(func_args_str):
    try:
        func_args = json.loads(func_args_str)
        desc = func_args.get("date_description")
        mini_client = get_openai_client()
        now_str = datetime.now().strftime("%Y-%m-%d (%A)")
        mini_response = await mini_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": f"Calcule a data exata. Hoje é {now_str}. Retorne: 'YYYY-MM-DD (Dia da Semana)'."},
                {"role": "user", "content": f"Qual a data de: {desc}?"}
            ],
            temperature=0.0
        )
        return mini_response.choices[0].message.content
    except Exception as e: return f"Erro ao calcular data: {str(e)}"

async def handle_unanswered_question(db, context_variables, func_args_str, history, agent_id):
    try:
        from models import UnansweredQuestionModel
        func_args = json.loads(func_args_str)
        question = func_args.get("pergunta")
        session_id = context_variables.get("session_id") or "Desconhecida"
        context_text = f"Sessão: {session_id}\nHistórico:\n" + "\n".join([f"{m.get('role')}: {m.get('content')}" for m in history[-5:]])
        new_q = UnansweredQuestionModel(agent_id=agent_id, session_id=session_id, question=question, context=context_text, status="PENDENTE")
        if db:
            db.add(new_q)
            await db.commit()
            return "Dúvida registrada para nossa equipe."
        return "Erro: Sem conexão com banco."
    except Exception as e: return f"Erro ao registrar dúvida: {str(e)}"
