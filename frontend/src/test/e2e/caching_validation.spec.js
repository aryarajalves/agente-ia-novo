import { test, expect } from '@playwright/test';

test('Test Prompt Caching in Chat Playground and take screenshot', async ({ page }) => {
  // Set longer timeout
  test.setTimeout(60000);

  // 1. Ir para a página de login
  await page.goto('/login');
  
  // 2. Limpar os campos obrigatoriamente antes de preencher
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  
  await emailInput.focus();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  
  await passwordInput.focus();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  
  // 3. Preencher credenciais corretas
  await emailInput.fill('aryarajmarketing@gmail.com');
  await passwordInput.fill('123456');
  
  // 4. Logar
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/');
  await page.waitForTimeout(2000); // Aguardar o carregamento
  
  // 5. Ir para o Playground de Chat do agente 1
  await page.goto('/playground?agentId=1');
  await page.waitForTimeout(3000); // Aguardar a inicialização do playground
  
  // 6. Enviar a primeira mensagem
  const chatInput = page.locator('textarea, input[placeholder*="mensagem"], input[placeholder*="Message"], textarea[placeholder*="mensagem"], textarea[placeholder*="Message"]');
  await expect(chatInput).toBeEnabled({ timeout: 15000 });
  await chatInput.fill('Olá, gostaria de saber mais sobre as regras do sistema.');
  await page.keyboard.press('Enter');
  
  // Esperar o robô responder (o textarea volta a ser habilitado quando termina de pensar)
  await expect(chatInput).toBeEnabled({ timeout: 20000 });
  
  // 7. Enviar a segunda mensagem em sequência
  await chatInput.fill('Qual o horário de funcionamento?');
  await page.keyboard.press('Enter');
  
  // Esperar a resposta terminar (textarea habilitado novamente)
  await expect(chatInput).toBeEnabled({ timeout: 20000 });
  
  // 8. Verificar se o badge '💾 CACHED' está na tela
  const cachedBadge = page.locator('.cached-tokens-pill');
  await expect(cachedBadge).toBeVisible();
  
  // 9. Tirar screenshot e salvar
  await page.screenshot({ 
    path: 'C:/Users/aryar/.gemini/antigravity/brain/1552ae3f-8361-4355-829f-f7c5ca882771/visual_validation_caching.png',
    fullPage: false 
  });
});
