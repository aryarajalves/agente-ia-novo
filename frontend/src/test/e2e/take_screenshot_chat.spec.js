import { test, expect } from '@playwright/test';

test('Take final validation screenshot of chat reset toast', async ({ page }) => {
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
  
  // 5. Ir para a rota do playground com agentId
  // Procuramos no banco local se o agente ID 4 existe, ou apenas vamos direto
  await page.goto('/playground?agentId=4');
  await page.waitForTimeout(3000); // Aguardar a inicialização do playground
  
  // 6. Clicar no botão de Resetar (⚡ Resetar)
  const resetBtn = page.locator('button.reset-btn');
  await expect(resetBtn).toBeVisible();
  await resetBtn.click();
  
  // 7. Esperar o toast aparecer (toast-notification)
  const toast = page.locator('.toast-notification');
  await expect(toast).toBeVisible();
  await page.waitForTimeout(500); // Aguardar renderizar completamente
  
  // 8. Tirar screenshot e salvar no diretório de artefatos do brain
  await page.screenshot({ 
    path: 'C:/Users/aryar/.gemini/antigravity/brain/0693ff56-3390-4791-8fb6-64163fa5b93a/screenshot_val_final.png',
    fullPage: false 
  });
});
