import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import AgentConfigModel

db = SessionLocal()
try:
    agents = db.query(AgentConfigModel).all()
    for a in agents:
        print(f"=== AGENTE ID {a.id}: {a.name} ===")
        print(f"MODEL: {a.model}")
        print(f"INITIAL MESSAGE: {a.initial_message}")
        print(f"INITIAL QUESTION: {a.initial_question_message}")
        print(f"SYSTEM PROMPT:\n{a.system_prompt}")
        print("="*40)
finally:
    db.close()
