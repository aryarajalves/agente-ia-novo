# Organização de Imports

Todos os imports ficam no topo do arquivo, em 3 grupos separados por uma linha em branco:

1. Bibliotecas padrão (os, sys, datetime, typing, io...)
2. Bibliotecas externas (fastapi, sqlalchemy, pydantic, minio...)
3. Módulos locais do projeto (app.config, app.models, app.routers...)

Nunca importar dentro do corpo de uma função a não ser para evitar import circular (e nesse caso, comentar o motivo).
