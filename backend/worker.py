import asyncio
import sys
import os

# Adiciona o diretório atual ao path para garantir que imports locais funcionem
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from worker_core.app import start_worker

if __name__ == "__main__":
    try:
        asyncio.run(start_worker())
    except KeyboardInterrupt:
        print("\nWorker parado manualmente pelo usuário.")
    except Exception as e:
        print(f"\nErro crítico no Worker: {e}")
        sys.exit(1)
