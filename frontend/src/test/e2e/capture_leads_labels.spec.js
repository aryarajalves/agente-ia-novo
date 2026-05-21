import { test, expect } from '@playwright/test';

test('Capture final validation screenshot of Leads Modal with Chatwoot labels', async ({ page }) => {
  // 1. Ir para a página de login
  await page.goto('http://localhost:5300/login');
  
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
  await expect(page).toHaveURL('http://localhost:5300/');
  
  // 5. Ir para /integrations
  await page.goto('http://localhost:5300/integrations');
  await page.waitForTimeout(2000); // Aguardar o carregamento da tela

  // Nova etapa: Clicar em "Configurar Webhooks"
  const configBtn = page.locator('button:has-text("Configurar Webhooks")');
  await expect(configBtn).toBeVisible();
  await configBtn.click();
  await page.waitForTimeout(2000); // Aguardar carregar o WebhookManager

  // 6. Clicar no botão "Contatos" do primeiro webhook card
  const contatosBtn = page.locator('button:has-text("Contatos")').first();
  await expect(contatosBtn).toBeVisible();
  await contatosBtn.click();
  
  // 7. Esperar carregar o modal e a lista de leads
  const leadCard = page.locator('.lead-card-premium').first();
  await expect(leadCard).toBeVisible();
  
  // 8. Clicar no primeiro lead para expandir
  await leadCard.click();
  await page.waitForTimeout(2000); // Aguardar renderização das tags e Accordion
  
  // 9. Tirar screenshot e salvar no diretório de artefatos do brain
  await page.screenshot({ 
    path: 'C:/Users/aryar/.gemini/antigravity/brain/cfbb1301-3a08-408b-b448-240d4d34f8ff/screenshot_val_final.png',
    fullPage: true 
  });
  
  console.log('✅ Screenshot capturada em C:/Users/aryar/.gemini/antigravity/brain/cfbb1301-3a08-408b-b448-240d4d34f8ff/screenshot_val_final.png');
});
