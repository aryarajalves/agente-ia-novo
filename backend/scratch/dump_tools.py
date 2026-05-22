import os
from database.connection import SessionLocal
from models import ToolModel # ou qual for o modelo de ferramentas no models.py

def dump():
    db = SessionLocal()
    try:
        # Vamos ver no models.py se a classe se chama ToolModel ou similar
        import models
        # listar todos os atributos de models para ver o nome do model de ferramentas
        models_attrs = dir(models)
        print("Atributos de models:", [a for a in models_attrs if "model" in a.lower() or "tool" in a.lower()])
    except Exception as e:
        print(f"Erro: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    dump()
