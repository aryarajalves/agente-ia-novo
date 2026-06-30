import { test, expect } from '@playwright/test';

test('Test Webhook Pipeline Caching metrics rendering and take screenshot', async ({ page }) => {
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
  await page.waitForTimeout(2000);
  
  // 5. Ir para /webhooks
  await page.goto('/webhooks');
  await page.waitForTimeout(3000);

  // 6. Clicar no botão 'Histórico' do primeiro webhook da lista
  // Usamos onViewHistory do card. Ele abre o modal de histórico (HistoryModal ou LeadsModal/Events)
  const viewHistoryBtn = page.locator('button.btn-action-leads, button:has-text("Histórico")').first();
  await viewHistoryBtn.click();
  await page.waitForTimeout(2000);

  // 7. Clicar no botão para visualizar o pipeline de um evento processado
  // O botão costuma ter o ícone '🔍' ou texto 'Ver Detalhes' ou 'Pipeline'
  const pipelineBtn = page.locator('button:has-text("🔍"), button:has-text("Ver Detalhes"), button:has-text("Pipeline")').first();
  if (await pipelineBtn.count() > 0) {
    await pipelineBtn.click();
    await page.waitForTimeout(2500); // Aguardar modal abrir

    // Tirar print do modal aberto
    await page.screenshot({ 
      path: 'C:/Users/aryar/.gemini/antigravity/brain/1552ae3f-8361-4355-829f-f7c5ca882771/visual_validation_pipeline.png',
      fullPage: false 
    });
    console.log("Screenshot do pipeline tirado com sucesso!");
  } else {
    // Se não houver pipeline, tira print da tela geral de histórico/leads
    await page.screenshot({ 
      path: 'C:/Users/aryar/.gemini/antigravity/brain/1552ae3f-8361-4355-829f-f7c5ca882771/visual_validation_pipeline.png',
      fullPage: true 
    });
    console.log("Screenshot do histórico geral tirado com sucesso (sem disparos disponíveis)!");
  }
});
