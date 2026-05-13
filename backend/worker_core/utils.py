import logging
import os
import asyncio

# Configuração de logs para o Worker
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("Worker")

# Worker Configuration
PREFETCH_COUNT = int(os.getenv("RABBITMQ_PREFETCH_COUNT", 5))
MESSAGE_DELAY = float(os.getenv("RABBITMQ_MESSAGE_DELAY", 1.0))

# Semaphores for private message concurrency control
semaphores = {}

def get_semaphore(name, value=1):
    if name not in semaphores:
        semaphores[name] = asyncio.Semaphore(value)
    return semaphores[name]
