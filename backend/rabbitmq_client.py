import asyncio
import os
import json
import logging
import aio_pika
from typing import Callable, Any

logger = logging.getLogger("RabbitMQClient")

class RabbitMQClient:
    def __init__(self):
        self.url = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")
        self.connection = None
        self.channel = None

    async def connect(self):
        """Conecta ao RabbitMQ e abre um canal"""
        for attempt in range(5):
            try:
                self.connection = await aio_pika.connect_robust(self.url)
                self.channel = await self.connection.channel()
                logger.info("✅ Conectado ao RabbitMQ com sucesso.")
                return
            except Exception as e:
                logger.error(f"❌ Falha ao conectar ao RabbitMQ (tentativa {attempt+1}/5): {e}")
                await asyncio.sleep(2)
        raise ConnectionError("Não foi possível conectar ao RabbitMQ após várias tentativas.")

    async def consume(self, queue_name: str, callback: Callable, prefetch_count: int = 1, requeue_on_error: bool = False):
        """Configura um consumidor para uma fila específica"""
        if not self.channel:
            await self.connect()

        await self.channel.set_qos(prefetch_count=prefetch_count)
        queue = await self.channel.declare_queue(queue_name, durable=True)

        async def wrapped_callback(message: aio_pika.IncomingMessage):
            async with message.process(requeue=requeue_on_error):
                try:
                    body = json.loads(message.body.decode())
                    await callback(body)
                except Exception as e:
                    logger.error(f"Error processing message from {queue_name}: {e}", exc_info=True)
                    # message.process with requeue handle the rest

        await queue.consume(wrapped_callback)
        logger.info(f"📥 Consumidor registrado para a fila: {queue_name}")

    async def publish_event(self, routing_key: str, data: Any):
        """Publica um evento em uma fila (direto para o exchange padrão)"""
        if not self.channel:
            await self.connect()

        try:
            message_body = json.dumps(data).encode()
            await self.channel.default_exchange.publish(
                aio_pika.Message(
                    body=message_body,
                    delivery_mode=aio_pika.DeliveryMode.PERSISTENT
                ),
                routing_key=routing_key
            )
        except Exception as e:
            logger.error(f"❌ Falha ao publicar evento em {routing_key}: {e}")

    async def close(self):
        """Fecha a conexão"""
        if self.connection:
            await self.connection.close()
            logger.info("🛑 Conexão com RabbitMQ encerrada.")

# Instância global para ser importada
rabbitmq = RabbitMQClient()
