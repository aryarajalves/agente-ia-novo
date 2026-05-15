# Regra de Deploy e Versionamento (Docker Hub)

Toda vez que for fazer deploy em produção, o agente deve obrigatoriamente realizar o build e o push das imagens do projeto para o Docker Hub.

**IMPORTANTE: ÚLTIMA VERSÃO CRIADA:** `1.6.4`
> *O agente DEVE atualizar este número aqui no arquivo de regra sempre que uma nova versão for publicada, para saber exatamente qual será a próxima.*

---

## Protocolo Obrigatório

### 0. Confirmação do GitHub
Antes de iniciar o build e o push no Docker Hub, o agente **DEVE PERGUNTAR** ao usuário se ele deseja fazer o commit e o push dessa nova versão para o repositório do GitHub (criando a tag da nova versão lá também).

### 1. Escopo do Deploy
É para fazer o build e o push **APENAS** do `frontend` e do `backend`. Não devem ser criadas imagens separadas para worker ou api avulsos, apenas as duas principais.

**URLs Oficiais das Imagens:**
- **Frontend:** `aryarajalves/configurar-agentes-ia:frontend-VERSAO`
- **Backend:** `aryarajalves/configurar-agentes-ia:backend-VERSAO`

### 2. Lógica de Versionamento (Regra do 10)
- O versionamento segue o formato X.Y.Z (ex: 1.6.1).
- O número da direita (Z) aumenta a cada novo deploy.
- **Regra:** Sempre que o número da direita chegar no 10, você o zera e **aumenta 1 na parte esquerda** (Y).
  - *Exemplo 1:* Se a versão atual for `1.6.9`, a próxima não será 1.6.10, e sim **`1.7.0`**.
  - *Exemplo 2:* Se a versão atual for `1.9.9`, a próxima será **`2.0.0`**.

### 3. Comandos de Execução (Exemplo para a próxima versão 1.6.2)

Ao executar o deploy, o agente deve rodar comandos equivalentes a estes:

```bash
# Frontend
docker build -t aryarajalves/configurar-agentes-ia:frontend-1.6.2 ./frontend
docker push aryarajalves/configurar-agentes-ia:frontend-1.6.2

# Backend
docker build -t aryarajalves/configurar-agentes-ia:backend-1.6.2 ./backend
docker push aryarajalves/configurar-agentes-ia:backend-1.6.2
```

Após executar esses comandos, o agente obrigatoriamente deve vir neste arquivo `deploy-docker-hub.md` e atualizar o campo **ÚLTIMA VERSÃO CRIADA** no topo.
