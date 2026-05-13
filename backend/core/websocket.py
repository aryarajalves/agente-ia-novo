import os
import json
import logging
import asyncio
import redis.asyncio as redis
from fastapi import WebSocket, WebSocketDisconnect
from typing import List

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.redis_client = None
        self.pubsub_task = None
        self.redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")

    async def init_redis(self, start_listener: bool = True):
        """Inicializa a conexão com Redis e opcionalmente o listener de Pub/Sub."""
        if not self.redis_client:
            try:
                self.redis_client = redis.from_url(self.redis_url, decode_responses=True)
                await self.redis_client.ping()
                logger.info(f"📡 Redis conectado (Listener: {start_listener})")
            except Exception as e:
                logger.error(f"❌ Erro ao conectar ao Redis: {e}")
                return

        if start_listener and not self.pubsub_task:
            try:
                self.pubsub_task = asyncio.create_task(self._redis_listener())
                logger.info("👂 Listener Redis Pub/Sub iniciado.")
            except Exception as e:
                logger.error(f"❌ Erro ao iniciar listener Redis: {e}")

    async def _redis_listener(self):
        """Escuta o canal de broadcast do Redis e repassa para os clientes locais."""
        try:
            pubsub = self.redis_client.pubsub()
            await pubsub.subscribe("websocket_broadcast")
            
            async for message in pubsub.listen():
                if message["type"] == "message":
                    try:
                        data = json.loads(message["data"])
                        await self._local_broadcast(data)
                    except Exception as e:
                        logger.error(f"Erro ao processar mensagem do Redis: {e}")
        except Exception as e:
            logger.error(f"Erro no listener do Redis: {e}")
            self.pubsub_task = None # Permite reiniciar
            await asyncio.sleep(5)
            if self.redis_client:
                await self.init_redis(start_listener=True)

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"Nova conexão WebSocket estabelecida. Total local: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"Conexão WebSocket encerrada. Total local: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Envia mensagem para todos os conectados via Redis Pub/Sub."""
        # Se o Redis não estiver pronto, tenta inicializar apenas o cliente (sem listener)
        if not self.redis_client:
            await self.init_redis(start_listener=False)

        if self.redis_client:
            try:
                await self.redis_client.publish("websocket_broadcast", json.dumps(message))
                return
            except Exception as e:
                logger.error(f"Falha ao publicar no Redis: {e}")
        
        # Fallback local se Redis falhar
        await self._local_broadcast(message)

    async def _local_broadcast(self, message: dict):
        """Envia mensagem apenas para os clientes conectados a este processo local."""
        if not self.active_connections:
            return
            
        logger.info(f"Broadcasting local via WebSocket: {message.get('type')}")
        disconnected_clients = []
        
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Erro ao enviar broadcast local: {e}")
                disconnected_clients.append(connection)
        
        for client in disconnected_clients:
            self.disconnect(client)

manager = ConnectionManager()
