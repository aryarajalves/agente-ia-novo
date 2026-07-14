import logging
import os
import re
import time
import unicodedata
import uuid
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func

from models import TestimonialModel, TestimonialCategoryModel
from api.deps import get_db, verify_api_key
from s3_service import s3_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Testimonials"])

# Limites oficiais de mídia do WhatsApp Business Platform (Cloud API) — validados no upload para
# não deixar cadastrar um depoimento que o WhatsApp vai rejeitar silenciosamente na hora do disparo
# (backend/agent_core/tools/handlers/testimonials.py). Espelha a validação já feita no frontend
# (TestimonialsManager.jsx); aqui é a garantia server-side, caso o upload não passe pelo painel.
# Fonte: developers.facebook.com/docs/whatsapp/cloud-api/reference/media#supported-media-types
WHATSAPP_MEDIA_LIMITS_MB = {"image": 5, "video": 16}

# Ordem padrão de listagem/disparo: quem tem order_position definido vem primeiro (menor
# número primeiro); quem ainda não tem (NULL) vai para o final, na ordem de criação.
# Usado tanto na listagem do painel quanto na seleção de mídias para o disparo no WhatsApp
# (backend/agent_core/tools/handlers/testimonials.py), para manter a MESMA ordem nos dois lugares.
#
# IMPORTANTE: a posição (order_position) só faz sentido DENTRO de cada categoria E TIPO DE MÍDIA
# (imagem/vídeo) — são filas independentes (é isso que a ferramenta 'enviar_depoimento' filtra
# antes de escolher as mídias, por categoria e, se pedido, por media_type). Por isso, duas mídias
# de categorias diferentes, OU do mesmo curso mas tipos diferentes (1 imagem e 1 vídeo), podem
# legitimamente mostrar o mesmo número "1" no painel. Para deixar isso visualmente claro (em vez
# de confuso), agrupamos por categoria e depois por tipo de mídia na listagem geral.
def _order_by_position(stmt):
    return stmt.order_by(
        TestimonialModel.category.asc(),
        TestimonialModel.media_type.asc(),
        func.coalesce(TestimonialModel.order_position, 2147483647).asc(),
        TestimonialModel.created_at.asc()
    )

@router.get("/testimonials")
async def list_testimonials(category: Optional[str] = None, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    """Lista todos os depoimentos cadastrados (com URLs assinadas para o frontend carregar)."""
    try:
        stmt = select(TestimonialModel)
        if category:
            stmt = stmt.where(TestimonialModel.category == category)
        stmt = _order_by_position(stmt)

        res = await db.execute(stmt)
        items = res.scalars().all()

        # Renumera (1..N, sem buracos) a posição de cada depoimento dentro da SUA categoria E
        # tipo de mídia (imagem e vídeo têm filas de posição independentes), respeitando a ordem
        # atual (já correta, vinda do ORDER BY acima). Isso corrige automaticamente "buracos"
        # deixados por exclusões antigas (antes da posição passar a ser renumerada ao excluir)
        # sem exigir nenhuma ação manual do usuário.
        category_counters = {}
        positions_changed = False
        for item in items:
            group_key = (item.category, item.media_type)
            next_pos = category_counters.get(group_key, 0) + 1
            category_counters[group_key] = next_pos
            if item.order_position != next_pos:
                item.order_position = next_pos
                positions_changed = True
        if positions_changed:
            await db.commit()

        output = []
        for item in items:
            # Gera URL presigned temporária para que o navegador consiga dar GET na mídia
            public_url = s3_service.generate_presigned_url(item.s3_key, expiration=3600)
            output.append({
                "id": item.id,
                "filename": item.filename,
                "s3_key": item.s3_key,
                "media_type": item.media_type,
                "category": item.category,
                "caption": item.caption,
                "file_size_bytes": item.file_size_bytes,
                "order_position": item.order_position,
                "created_at": item.created_at,
                "url": public_url
            })

        return output
    except Exception as e:
        logger.error(f"Erro ao listar depoimentos: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/testimonials/upload")
async def upload_testimonial(
    category: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    """Faz o upload de uma imagem ou vídeo de depoimento para o S3/MinIO e registra no banco."""
    try:
        # Detecta o tipo de mídia pela extensão do arquivo
        ext = os.path.splitext(file.filename)[1].lower()
        if ext in [".png", ".jpg", ".jpeg", ".gif", ".webp"]:
            media_type = "image"
        elif ext in [".mp4", ".mov", ".avi", ".webm", ".mkv", ".ogg"]:
            media_type = "video"
        else:
            raise HTTPException(status_code=400, detail="Formato de arquivo não suportado. Use apenas imagens ou vídeos.")

        # Caminho e arquivo temporário local para fazer o upload
        s3_key = f"testimonials/{int(time.time())}_{uuid.uuid4()}{ext}"
        temp_dir = os.path.join(os.getcwd(), "tmp_uploads")
        os.makedirs(temp_dir, exist_ok=True)
        local_path = os.path.join(temp_dir, f"{uuid.uuid4()}{ext}")

        # Salva localmente antes do upload
        with open(local_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Tamanho real do arquivo (a partir da cópia local, mais confiável que UploadFile.size)
        file_size_bytes = os.path.getsize(local_path)

        # Valida contra o limite oficial do WhatsApp para esse tipo de mídia ANTES de gastar
        # banda/armazenamento subindo pro S3 — um arquivo acima do limite seria aceito aqui mas
        # rejeitado silenciosamente pelo WhatsApp na hora do disparo pro cliente.
        max_size_mb = WHATSAPP_MEDIA_LIMITS_MB.get(media_type)
        if max_size_mb and file_size_bytes > max_size_mb * 1024 * 1024:
            os.remove(local_path)
            file_size_mb = file_size_bytes / (1024 * 1024)
            tipo_label = "imagens" if media_type == "image" else "vídeos"
            raise HTTPException(
                status_code=400,
                detail=f"Arquivo muito grande ({file_size_mb:.1f}MB). O WhatsApp só aceita {tipo_label} de até {max_size_mb}MB."
            )

        # Upload para o S3/MinIO
        # Como o s3_service.upload_file recebe um UploadFile ou um arquivo local dependendo do wrapper,
        # usaremos o upload_file nativo passando o arquivo local para ser robusto
        success = False
        try:
            # Instancia o S3Service e chama upload
            from botocore.exceptions import ClientError
            with open(local_path, "rb") as f_data:
                s3_service.s3_client.put_object(
                    Bucket=s3_service.bucket_name,
                    Key=s3_key,
                    Body=f_data,
                    ContentType=file.content_type
                )
            success = True
        except Exception as upload_err:
            logger.error(f"Falha ao realizar upload do depoimento para o S3: {upload_err}")
        
        # Remove arquivo local
        if os.path.exists(local_path):
            os.remove(local_path)

        if not success:
            raise HTTPException(status_code=500, detail="Erro no upload do arquivo para o storage.")

        # Posição de disparo: novo depoimento entra no final da fila da sua categoria + tipo de
        # mídia (imagens e vídeos têm posições independentes).
        max_pos_res = await db.execute(
            select(func.max(TestimonialModel.order_position)).where(
                TestimonialModel.category == category,
                TestimonialModel.media_type == media_type
            )
        )
        max_pos = max_pos_res.scalar()
        next_position = (max_pos or 0) + 1

        # Cria registro no banco de dados
        new_testimonial = TestimonialModel(
            filename=file.filename,
            s3_key=s3_key,
            media_type=media_type,
            category=category,
            file_size_bytes=file_size_bytes,
            order_position=next_position
        )
        db.add(new_testimonial)
        await db.commit()
        await db.refresh(new_testimonial)

        return {"message": "Depoimento cadastrado com sucesso.", "id": new_testimonial.id, "filename": file.filename}
    except HTTPException as http_e:
        raise http_e
    except Exception as e:
        logger.error(f"Erro no upload de depoimento: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


class TestimonialUpdate(BaseModel):
    category: Optional[str] = None
    caption: Optional[str] = None
    order_position: Optional[int] = None
    filename: Optional[str] = None


@router.patch("/testimonials/{id}")
async def update_testimonial(id: int, payload: TestimonialUpdate, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    """Atualiza a categoria, legenda customizada, o nome do arquivo e/ou a posição de ordenação de um depoimento já cadastrado."""
    try:
        stmt = select(TestimonialModel).where(TestimonialModel.id == id)
        res = await db.execute(stmt)
        item = res.scalars().first()
        if not item:
            raise HTTPException(status_code=404, detail="Depoimento não encontrado.")

        if payload.category is not None:
            category = payload.category.strip()
            if not category:
                raise HTTPException(status_code=400, detail="A categoria não pode ficar vazia.")
            item.category = category

        if payload.caption is not None:
            # String vazia limpa a legenda customizada, voltando ao texto padrão no envio.
            item.caption = payload.caption.strip() or None

        if payload.filename is not None:
            filename = payload.filename.strip()
            if not filename:
                raise HTTPException(status_code=400, detail="O nome do arquivo não pode ficar vazio.")
            item.filename = filename

        if payload.order_position is not None:
            # Reposiciona o item dentro da SUA categoria + tipo de mídia atuais (já considerando
            # uma eventual troca de categoria feita no mesmo PATCH, aplicada logo acima; o tipo de
            # mídia não é editável, então item.media_type já é o correto). Em vez de apenas
            # sobrescrever o número (o que poderia gerar duas mídias com a mesma posição),
            # inserimos o item na posição desejada e renumeramos 1..N os demais do mesmo grupo,
            # exatamente como um "trocar de lugar" faria.
            siblings_stmt = _order_by_position(
                select(TestimonialModel).where(
                    TestimonialModel.category == item.category,
                    TestimonialModel.media_type == item.media_type,
                    TestimonialModel.id != item.id
                )
            )
            siblings_res = await db.execute(siblings_stmt)
            siblings = list(siblings_res.scalars().all())

            desired_index = max(0, min(payload.order_position - 1, len(siblings)))
            siblings.insert(desired_index, item)

            for idx, sib in enumerate(siblings, start=1):
                sib.order_position = idx

        await db.commit()
        await db.refresh(item)

        return {
            "id": item.id,
            "filename": item.filename,
            "category": item.category,
            "caption": item.caption,
            "order_position": item.order_position
        }
    except HTTPException as http_e:
        raise http_e
    except Exception as e:
        logger.error(f"Erro ao atualizar depoimento {id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


class TestimonialMove(BaseModel):
    direction: str  # "up" ou "down"


@router.post("/testimonials/{id}/move")
async def move_testimonial(id: int, payload: TestimonialMove, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    """
    Move um depoimento uma posição para cima ou para baixo na ordem de disparo,
    dentro da SUA PRÓPRIA categoria E TIPO DE MÍDIA (a ordem só importa dentro desse
    grupo, pois é isso que a ferramenta 'enviar_depoimento' filtra antes de escolher
    as mídias — imagens e vídeos têm filas de posição independentes).
    Normaliza (renumera 1..N) todos os depoimentos do grupo antes de trocar as
    posições, para funcionar mesmo com registros antigos que ainda estejam com
    order_position vazio.
    """
    if payload.direction not in ("up", "down"):
        raise HTTPException(status_code=400, detail="direction deve ser 'up' ou 'down'.")

    try:
        stmt = select(TestimonialModel).where(TestimonialModel.id == id)
        res = await db.execute(stmt)
        target = res.scalars().first()
        if not target:
            raise HTTPException(status_code=404, detail="Depoimento não encontrado.")

        # Busca todos os depoimentos da mesma categoria + tipo de mídia, já na ordem de disparo atual
        stmt_siblings = _order_by_position(
            select(TestimonialModel).where(
                TestimonialModel.category == target.category,
                TestimonialModel.media_type == target.media_type
            )
        )
        res_siblings = await db.execute(stmt_siblings)
        siblings = res_siblings.scalars().all()

        # Normaliza as posições (1..N) respeitando a ordem atual
        for idx, sib in enumerate(siblings, start=1):
            sib.order_position = idx

        target_index = next(i for i, sib in enumerate(siblings) if sib.id == target.id)
        neighbor_index = target_index - 1 if payload.direction == "up" else target_index + 1

        if neighbor_index < 0 or neighbor_index >= len(siblings):
            # Já está na primeira/última posição: nada a fazer, mas mantém a normalização
            await db.commit()
            return {"id": target.id, "order_position": target.order_position, "moved": False}

        neighbor = siblings[neighbor_index]
        target.order_position, neighbor.order_position = neighbor.order_position, target.order_position

        await db.commit()
        await db.refresh(target)

        return {"id": target.id, "order_position": target.order_position, "moved": True}
    except HTTPException as http_e:
        raise http_e
    except Exception as e:
        logger.error(f"Erro ao mover depoimento {id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/testimonials/{id}")
async def delete_testimonial(id: int, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    """Deleta o depoimento do S3/MinIO e remove o registro do banco de dados."""
    try:
        # Busca registro
        stmt = select(TestimonialModel).where(TestimonialModel.id == id)
        res = await db.execute(stmt)
        item = res.scalars().first()
        if not item:
            raise HTTPException(status_code=404, detail="Depoimento não encontrado.")

        category = item.category
        media_type = item.media_type

        # Deleta no S3/MinIO
        try:
            s3_service.delete_file(item.s3_key)
        except Exception as s3_err:
            logger.warning(f"Erro ao deletar arquivo de depoimento do S3 ({item.s3_key}): {s3_err}")

        # Deleta do banco
        await db.delete(item)
        await db.flush()

        # Renumera (1..N) os depoimentos restantes da mesma categoria + tipo de mídia, para não
        # deixar "buracos" na ordem de disparo (ex: 1, 3, 4 depois de excluir o que era a posição 2).
        remaining_stmt = _order_by_position(
            select(TestimonialModel).where(
                TestimonialModel.category == category,
                TestimonialModel.media_type == media_type
            )
        )
        remaining_res = await db.execute(remaining_stmt)
        remaining = remaining_res.scalars().all()
        for idx, sib in enumerate(remaining, start=1):
            sib.order_position = idx

        await db.commit()

        return {"message": "Depoimento excluído com sucesso."}
    except HTTPException as http_e:
        raise http_e
    except Exception as e:
        logger.error(f"Erro ao deletar depoimento {id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# --- CATEGORY ENDPOINTS ---

class TestimonialCategoryCreate(BaseModel):
    name: str
    value: Optional[str] = None

def slugify(text: str) -> str:
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('utf-8')
    text = re.sub(r'[^\w\s-]', '', text).strip().lower()
    return re.sub(r'[-\s]+', '_', text)

def _prettify_category_label(value: str) -> str:
    """Converte um slug (ex: 'aluguel_maquinas') em um nome legível (ex: 'Aluguel Maquinas')."""
    return " ".join(w.capitalize() for w in re.split(r'[_\-]+', value) if w) or value

@router.get("/testimonials/categories")
async def list_testimonial_categories(db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    """Lista todas as categorias de depoimentos."""
    try:
        stmt = select(TestimonialCategoryModel).order_by(TestimonialCategoryModel.name.asc())
        res = await db.execute(stmt)
        items = res.scalars().all()

        # Auto-registra categorias "órfãs": valores usados em testimonials.category que nunca
        # foram formalmente cadastrados em testimonial_categories (ex: dados inseridos por um
        # caminho antigo, antes dessa tabela existir, ou diretamente no banco). Sem isso, essas
        # categorias ficam "invisíveis" no filtro do painel e no seletor do modal de edição,
        # mesmo aparecendo normalmente como etiqueta no card do depoimento.
        registered_values = {item.value for item in items}
        distinct_res = await db.execute(select(TestimonialModel.category).distinct())
        used_values = {row[0] for row in distinct_res.all() if row[0]}
        orphan_values = used_values - registered_values

        if orphan_values:
            for value in sorted(orphan_values):
                db.add(TestimonialCategoryModel(name=_prettify_category_label(value), value=value))
            await db.commit()

            stmt = select(TestimonialCategoryModel).order_by(TestimonialCategoryModel.name.asc())
            res = await db.execute(stmt)
            items = res.scalars().all()

        return [{"id": item.id, "name": item.name, "value": item.value} for item in items]
    except Exception as e:
        logger.error(f"Erro ao listar categorias: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/testimonials/categories")
async def create_testimonial_category(payload: TestimonialCategoryCreate, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    """Cria uma nova categoria de depoimentos."""
    try:
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="O nome da categoria não pode estar vazio.")

        value = payload.value.strip() if payload.value else slugify(name)
        if not value:
            raise HTTPException(status_code=400, detail="O valor/slug da categoria não pode estar vazio.")

        # Verifica se já existe nome ou value
        stmt_exist = select(TestimonialCategoryModel).where(
            (TestimonialCategoryModel.name == name) | (TestimonialCategoryModel.value == value)
        )
        res_exist = await db.execute(stmt_exist)
        if res_exist.scalars().first():
            raise HTTPException(status_code=400, detail="Uma categoria com este nome ou identificador já existe.")

        new_cat = TestimonialCategoryModel(name=name, value=value)
        db.add(new_cat)
        await db.commit()
        await db.refresh(new_cat)

        return {"id": new_cat.id, "name": new_cat.name, "value": new_cat.value}
    except HTTPException as http_e:
        raise http_e
    except Exception as e:
        logger.error(f"Erro ao criar categoria de depoimento: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/testimonials/categories/{id}")
async def delete_testimonial_category(id: int, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    """Exclui uma categoria e todos os depoimentos vinculados a ela."""
    try:
        stmt = select(TestimonialCategoryModel).where(TestimonialCategoryModel.id == id)
        res = await db.execute(stmt)
        cat = res.scalars().first()
        if not cat:
            raise HTTPException(status_code=404, detail="Categoria não encontrada.")

        # Busca todos os depoimentos dessa categoria
        stmt_dep = select(TestimonialModel).where(TestimonialModel.category == cat.value)
        res_dep = await db.execute(stmt_dep)
        deps = res_dep.scalars().all()

        # Deleta depoimentos no S3
        for dep in deps:
            try:
                s3_service.delete_file(dep.s3_key)
            except Exception as s3_err:
                logger.warning(f"Erro ao deletar arquivo de depoimento {dep.s3_key} do S3: {s3_err}")
            await db.delete(dep)

        # Deleta a categoria
        await db.delete(cat)
        await db.commit()

        return {"message": "Categoria e depoimentos associados excluídos com sucesso."}
    except HTTPException as http_e:
        raise http_e
    except Exception as e:
        logger.error(f"Erro ao excluir categoria de depoimento: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

