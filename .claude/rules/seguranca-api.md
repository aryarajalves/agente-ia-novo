# Segurança da API

- Toda rota (exceto `/auth/login` e `/health`) exige token JWT válido (`Depends(get_current_user)`).
- Vendedor só acessa/edita os próprios recursos (`seller_id == current_user.id`); toda query sensível deve filtrar por isso para evitar IDOR.
- Rotas administrativas (criar/editar vendedor) exigem `Depends(get_current_admin)`.
- Uploads de nota fiscal validam `content_type` contra uma lista permitida antes de enviar ao MinIO.
