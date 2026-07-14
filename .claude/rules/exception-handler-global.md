# Exception Handler Global

`backend/app/main.py` deve manter o handler global de exceções (`@app.exception_handler(Exception)`), que:

- Loga o erro via `app.core.logger.logger`.
- Retorna sempre `{"detail": "..."}` com status 500, sem expor stack trace.
- Não interfere em `HTTPException`, que continua tratada normalmente pelos routers.
