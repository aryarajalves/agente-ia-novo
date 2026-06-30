import { test, expect } from '@playwright/test';

test('Configure combined AND conditional and take screenshot', async ({ page }) => {
  // 1. Ir para a página de login
  await page.goto('/login');
  
  // 2. Limpar os campos obrigatoriamente antes de preencher
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  
  await emailInput.focus();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await emailInput.fill('');
  
  await passwordInput.focus();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await passwordInput.fill('');
  
  // 3. Preencher credenciais corretas
  await emailInput.fill('aryarajmarketing@gmail.com');
  await passwordInput.fill('123456');
  
  // 4. Logar
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/', { timeout: 15000 });
  
  // 5. Ir para /agent/1 (ou tentar encontrar um agente se falhar)
  await page.goto('/agent/1');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  const url = page.url();
  if (url.includes('/login') || !url.includes('/agent/')) {
    console.log("Não foi possível acessar /agent/1 diretamente. Tentando pelo painel principal...");
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const agentLink = page.locator('a[href^="/agent/"], .agent-card, tr[onclick*="agent"]').first();
    if (await agentLink.count() > 0) {
      console.log("Clicando no agente encontrado na listagem...");
      await agentLink.click();
      await page.waitForLoadState('networkidle');
    } else {
      console.log("Nenhum agente listado. Indo para /agent/new...");
      await page.goto('/agent/new');
      await page.waitForLoadState('networkidle');
    }
  }

  // 6. Clicando na aba do Editor de Prompt
  const promptTab = page.locator('button:has-text("Editor Prompt"), .tab-btn:has-text("Editor Prompt"), [data-tab="prompts"]');
  await promptTab.click();
  await page.waitForTimeout(1000);

  // 7. Clicando em 'Inserir Condicional'
  const insertCondBtn = page.locator('button:has-text("Inserir Condicional"), .insert-cond-btn');
  await insertCondBtn.click();
  await page.waitForTimeout(1500); // Aguardar animação de abertura do modal

  // 8. No modal, clicando em 'dia_semana'
  const diaSemanaRow = page.locator('.var-row-item:has-text("dia_semana")');
  await diaSemanaRow.click();
  await page.waitForTimeout(500);

  // 9. Selecionando operador '=='
  await page.locator('select.cond-custom-select').nth(0).selectOption('==');
  await page.waitForTimeout(500);

  // 10. Escolhendo 'segunda-feira'
  await page.locator('select.cond-custom-select').nth(1).selectOption('segunda-feira');
  await page.waitForTimeout(500);

  // 11. Marcando a caixa de seleção de AND
  await page.locator('input.cond-checkbox').check();
  await page.waitForTimeout(500);

  // 12. Escolhendo a segunda variável como 'hora_atual'
  await page.locator('select.cond-custom-select').nth(2).selectOption('hora_atual');
  await page.waitForTimeout(500);

  // 13. Selecionando o operador '>='
  await page.locator('select.cond-custom-select').nth(3).selectOption('>=');
  await page.waitForTimeout(500);

  // 14. Definindo o valor '18:00'
  await page.locator('input.cond-custom-input').fill('18:00');
  await page.waitForTimeout(1000);

  // 15. Tirando screenshot e salvando no diretório do brain
  await page.screenshot({ 
    path: 'C:/Users/aryar/.gemini/antigravity/brain/a741e6cb-9dee-4666-9083-4d8398f56375/condicional_combinada_and.png',
    fullPage: false 
  });
  console.log("Screenshot tirada com sucesso!");
});
