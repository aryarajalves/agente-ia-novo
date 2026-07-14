# Logs do Backend

Usar `from app.core.logger import logger` para registrar início/fim de processos críticos e erros em blocos `try/except`, com contexto útil (id do recurso, rota, mensagem original). Mensagens em português, sem verbosidade excessiva em loops.
