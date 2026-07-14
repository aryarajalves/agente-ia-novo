from database import SessionLocal
from models import TranscriptionTaskModel
from sqlalchemy import desc

db = SessionLocal()
tasks = db.query(TranscriptionTaskModel).order_by(desc(TranscriptionTaskModel.id)).limit(10).all()
print("=== ÚLTIMAS TAREFAS DE TRANSCRIÇÃO ===")
for t in tasks:
    error_msg = getattr(t, "error_message", None)
    if not error_msg:
        # Tenta pegar qualquer outro atributo que possa conter o erro
        error_msg = getattr(t, "error", None) or getattr(t, "details", None)
    print(f"ID: {t.id} | Filename: {t.filename} | Status: {t.status} | Error: {error_msg} | S3 Key: {t.s3_key}")
