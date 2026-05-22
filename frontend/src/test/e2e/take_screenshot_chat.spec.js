import { test, expect } from '@playwright/test';

test('Take final validation screenshot of dashboard', async ({ page }) => {
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
  await page.waitForTimeout(3000); // Aguardar o carregamento
  
  // 5. Tirar screenshot e salvar no diretório de artefatos do brain
  await page.screenshot({ 
    path: 'C:/Users/aryar/.gemini/antigravity/brain/676fda0e-1d5b-464c-b391-00f4722b2891/screenshot_val_final.png',
    fullPage: true 
  });
});
