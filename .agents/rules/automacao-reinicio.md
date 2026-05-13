---
trigger: always_on
---

# Regra de Reinício Automático e Validação de Conectividade

Toda vez que você criar uma nova mecânica, interface ou código Python, você deve reiniciar os containers imediatamente. O reinício só é considerado bem-sucedido se o serviço for validado como "Online".

**Requisitos Obrigatórios:**
1. **Limpeza de Cache e Recriação:** Use sempre `--force-recreate` para assegurar que as atualizações foram aplicadas e o cache limpo.
2. **Validação de Conectividade:** Após o comando de reinício, você DEVE validar se a porta está respondendo (ex: usando `curl -I` ou o `browser_subagent`).
3. **Transparência e Logs:** Informe quais containers foram reiniciados e anexe um trecho do log de boot (`docker logs --tail 20`) para provar que o serviço subiu sem erros.

Isso garante que o sistema sempre reflita a versão mais recente e que o agente não deixe o sistema "fora do ar" após um deploy mal sucedido.
