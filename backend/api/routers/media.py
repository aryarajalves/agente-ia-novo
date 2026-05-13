import os
import uuid
import io
import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from api.deps import verify_api_key
from s3_service import s3_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Media"])

@router.post("/upload-image")
async def upload_image_endpoint(file: UploadFile = File(...), _: None = Depends(verify_api_key)):
    """Faz o upload de uma imagem para o S3 (ou local como fallback) e retorna a URL pública."""
    logger.info(f"Recebendo upload de imagem: {file.filename}")

    if not file.filename:
        raise HTTPException(status_code=400, detail="Arquivo sem nome")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        if file.content_type == "image/jpeg": ext = ".jpg"
        elif file.content_type == "image/png": ext = ".png"
        elif file.content_type == "image/webp": ext = ".webp"
        else: ext = ".png"

    filename = f"{uuid.uuid4()}{ext}"

    try:
        content = await file.read()
    except Exception as e:
        logger.error(f"Erro ao ler arquivo: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno ao ler imagem: {str(e)}")

    # --- Tenta upload no S3 ---
    s3_configured = all([
        os.getenv("S3_ENDPOINT_URL"),
        os.getenv("S3_ACCESS_KEY"),
        os.getenv("S3_SECRET_KEY"),
        os.getenv("S3_BUCKET_NAME"),
    ])

    if s3_configured:
        try:
            s3_key = f"chat-images/{filename}"
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(
                None,
                lambda: s3_service.s3_client.put_object(
                    Bucket=s3_service.bucket_name,
                    Key=s3_key,
                    Body=content,
                    ContentType=file.content_type or "image/jpeg",
                )
            )
            public_url = s3_service.get_public_url(s3_key)
            if public_url:
                logger.info(f"✅ Imagem enviada ao S3: {public_url}")
                return {"image_url": public_url, "filename": filename, "storage": "s3"}
        except Exception as e:
            logger.error(f"Erro no upload S3: {e} — usando fallback local.")

    # --- Fallback: salvar localmente ---
    os.makedirs("tmp_uploads", exist_ok=True)
    upload_path = os.path.join("tmp_uploads", filename)
    try:
        with open(upload_path, "wb") as f:
            f.write(content)
    except Exception as e:
        logger.error(f"Erro ao salvar arquivo local: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno ao salvar imagem: {str(e)}")

    base_url = os.getenv("BACKEND_URL", os.getenv("VITE_API_URL", "http://localhost:8000")).rstrip('/')
    image_url = f"{base_url}/uploads/{filename}"
    return {"image_url": image_url, "filename": filename, "storage": "local"}
