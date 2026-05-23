import asyncio
import os
import requests
import json
from playwright.async_api import async_playwright

def setup_test_data():
    print("Iniciando setup dos dados de teste no backend...")
    
    # 1. Criar o webhook config
    webhook_url = "http://localhost:8002/webhooks"
    webhook_payload = {
        "name": "Webhook Teste",
        "leads_table": "leads_teste",
        "is_active": True
    }
    
    try:
        res = requests.post(webhook_url, json=webhook_payload)
        res.raise_for_status()
        webhook_data = res.json()
        token = webhook_data.get("token")
        print(f"Webhook criado com sucesso! Token: {token}")
    except Exception as e:
        print(f"Erro ao criar webhook (pode ser que já exista): {e}")
        try:
            res = requests.get(webhook_url)
            webhooks = res.json()
            if webhooks:
                token = webhooks[0].get("token")
                print(f"Usando token do webhook existente: {token}")
            else:
                raise Exception("Nenhum webhook retornado na listagem.")
        except Exception as e2:
            print(f"Falha ao recuperar webhook existente: {e2}")
            return None
            
    # 2. Enviar evento para popular leads e mensagens
    receive_url = f"http://localhost:8002/webhooks/receive/{token}"
    event_payload = {
        "id": "msg_teste_12345",
        "message_type": "incoming",
        "content": "Olá, preciso de ajuda com o teste do retry",
        "sender": {
            "phone_number": "5511999998888",
            "name": "Aryaraj Alves"
        },
        "conversation": {
            "id": "conv_999",
            "labels": ["suporte"]
        }
    }
    
    try:
        res = requests.post(receive_url, json=event_payload)
        res.raise_for_status()
        print("Evento de teste enviado com sucesso para popular leads/mensagens.")
    except Exception as e:
        print(f"Erro ao enviar evento de teste: {e}")
        
    return token

async def main():
    token = setup_test_data()
    
    async with async_playwright() as p:
        try:
            browser = await p.chromium.launch(headless=True, channel="chrome")
        except Exception as e:
            print(f"Erro ao abrir com channel='chrome': {e}")
            browser = await p.chromium.launch(headless=True)
            
        page = await browser.new_page()
        page.set_default_timeout(15000)
        
        # Registrar logs do console da página
        page.on("console", lambda msg: print(f"[Page Console] {msg.text}"))
        page.on("pageerror", lambda err: print(f"[Page Error] {err.message}"))
        
        await page.set_viewport_size({"width": 1280, "height": 800})
        
        print("Acessando a página de login...")
        await page.goto("http://localhost:5300/login")
        
        print("Preenchendo credenciais...")
        await page.locator('input[type="email"]').fill("")
        await page.locator('input[type="email"]').type("aryarajmarketing@gmail.com")
        
        await page.locator('input[type="password"]').fill("")
        await page.locator('input[type="password"]').type("123456")
        
        print("Clicando no botão de login...")
        await page.click('button[type="submit"]')
        
        await page.wait_for_url("**/", timeout=10000)
        print("Login realizado! Navegando diretamente para /webhooks...")
        await page.goto("http://localhost:5300/webhooks")
        
        artifact_dir = r"C:\Users\aryar\.gemini\antigravity\brain\38f2c77c-4aef-4957-8ca4-feb84f31b281"
        
        try:
            print("Aguardando lista de webhooks...")
            await page.wait_for_selector('button:has-text("Contatos")', timeout=10000)
            
            print("Clicando em 'Contatos'...")
            await page.locator('button:has-text("Contatos")').first.click()
            
            print("Aguardando LeadsModal e clicando em 'Histórico'...")
            await page.wait_for_selector('button:has-text("Histórico")')
            await page.locator('button:has-text("Histórico")').first.click()
            
            print("Aguardando LeadHistoryModal...")
            await page.wait_for_selector('button[title="Excluir"]')
            await asyncio.sleep(2)
            
            screenshot_path = os.path.join(artifact_dir, "depois_historico.png")
            await page.screenshot(path=screenshot_path)
            print(f"Sucesso! Screenshot salvo em: {screenshot_path}")
            
        except Exception as err:
            print(f"Erro ocorrido durante o fluxo: {err}")
            # Salvar HTML de erro
            html = await page.content()
            html_path = os.path.join(artifact_dir, "erro_debug.html")
            with open(html_path, "w", encoding="utf-8") as f:
                f.write(html)
            print(f"HTML de depuração salvo em: {html_path}")
            
            # Tirar screenshot de erro
            err_screenshot_path = os.path.join(artifact_dir, "erro_webhooks.png")
            await page.screenshot(path=err_screenshot_path)
            print(f"Screenshot de erro salvo em: {err_screenshot_path}")
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
