"""
api/main.py — Ponto de entrada da API modular.

Este módulo monta a aplicação FastAPI e registra todos os sub-roteadores.
O main.py legado pode importar `app` daqui como proxy de compatibilidade.
"""
import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from api.limiter import limiter
from api.routers import auth, agents, knowledge, analytics, media, sessions, tools, variables, feedback, chat, tester, integrations, support
from fastapi import WebSocket, WebSocketDisconnect
from core.websocket import manager

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / Shutdown lifecycle."""
    logger.info("🚀 API Modular iniciando...")
    # Importar inicializações do banco se necessário
    try:
        from database import init_db
        await init_db()
        logger.info("✅ Banco de dados inicializado.")
        
        # Inicializar Redis para WebSocket Pub/Sub
        await manager.init_redis()
    except Exception as e:
        logger.warning(f"⚠️ Falha na inicialização do banco: {e}")
    yield
    logger.info("🛑 API Modular encerrando...")


app = FastAPI(
    title="Jaime AI API",
    description="API modular para o sistema de agentes de IA Jaime.",
    version="2.0.0",
    lifespan=lifespan,
)

# --- RATE LIMITING ---
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# --- CORS ---
raw_origins = os.getenv("CORS_ALLOWED_ORIGINS", "*").split(",")
cors_origins = [o.strip() for o in raw_origins if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True if cors_origins != ["*"] else False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- GLOBAL EXCEPTION HANDLER ---
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"ERRO GLOBAL: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Erro interno no servidor", "error": str(exc)},
    )

# --- HEALTH CHECK ---
@app.get("/ping", tags=["Health"])
async def ping():
    return {"status": "ok", "message": "Backend is reachable"}

# --- STATIC FILES ---
try:
    app.mount("/static", StaticFiles(directory="widget"), name="static")
except Exception:
    logger.warning("⚠️ Diretório 'widget' não encontrado — /static não montado.")

try:
    os.makedirs("tmp_uploads", exist_ok=True)
    app.mount("/uploads", StaticFiles(directory="tmp_uploads"), name="uploads")
except Exception:
    logger.warning("⚠️ Não foi possível montar /uploads.")

# --- ROUTERS ---
app.include_router(auth.router)
app.include_router(agents.router)
app.include_router(knowledge.router)
app.include_router(analytics.router)
app.include_router(media.router)
app.include_router(sessions.router)
app.include_router(tools.router)
app.include_router(variables.router)
app.include_router(feedback.router)
app.include_router(chat.router)
app.include_router(tester.router)
app.include_router(integrations.router)
app.include_router(support.router)

# --- WEBSOCKET ---
@app.websocket("/ws/events")
async def websocket_events(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Mantém a conexão aberta. Podemos receber pings se necessário.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"Erro no WebSocket: {e}")
        manager.disconnect(websocket)

# Routers legados (importados do main.py original)
try:
    from prompt_lab import router as prompt_lab_router
    app.include_router(prompt_lab_router)
except ImportError:
    logger.warning("⚠️ prompt_lab não encontrado.")

try:
    from session_analysis import router as analysis_router
    app.include_router(analysis_router)
except ImportError:
    logger.warning("⚠️ session_analysis não encontrado.")

try:
    from webhooks.router import router as webhook_router
    app.include_router(webhook_router)
except ImportError:
    logger.warning("⚠️ webhooks.router não encontrado.")
