# Regra: Identificação de Tunel Cloudflare

A URL `https://backendagente.aryaraj.shop` **NÃO** deve ser considerada um ambiente de produção isolado/remoto no sentido tradicional de "deploy final".

**Protocolo Obrigatório:**
1. **Natureza do Link**: Este link é um túnel do Cloudflare que aponta diretamente para o **localhost** do backend em execução na máquina do usuário.
2. **Ambiente de Desenvolvimento**: Trate as interações com este link como se estivesse interagindo com o `localhost:8000` (ou a porta mapeada).
3. **Persistência**: Alterações feitas no código local refletem imediatamente através deste túnel.
4. **Variáveis de Ambiente**: As variáveis `.env` que utilizam este link são válidas para o ambiente de desenvolvimento híbrido (frontend local -> backend local via túnel).

Isso garante que o agente não hesite em realizar alterações no backend pensando que está afetando um servidor de produção externo inacessível.
