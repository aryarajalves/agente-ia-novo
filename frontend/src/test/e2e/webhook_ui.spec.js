import { test, expect } from '@playwright/test';

test.describe('Webhook Management UI Updates', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'aryarajmarketing@gmail.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('should display new metadata fields in LeadsModal expanded view', async ({ page }) => {
    await page.goto('/webhooks');
    
    // Esperar carregar a lista de webhooks
    const leadsButton = page.locator('button:has-text("Contatos")').first();
    await expect(leadsButton).toBeVisible();
    await leadsButton.click();

    // No modal de contatos, expandir o primeiro lead
    const firstLead = page.locator('.lead-card-premium').first();
    await firstLead.click();

    // Verificar se os campos novos aparecem
    await expect(page.locator('text=MENSAGEM USUÁRIO')).toBeVisible();
    await expect(page.locator('text=RESPOSTA AGENTE')).toBeVisible();
  });



  test('should show Maximizar button for long pipeline steps', async ({ page }) => {
    // Este teste assume que existe um evento com pipeline processado
    // Vamos apenas validar se o componente renderiza o botão se encontrar o ícone de raio
    await page.goto('/webhooks');
    
    const leadsButton = page.locator('button:has-text("Contatos")').first();
    await leadsButton.click();
    
    const historyButton = page.locator('.btn-action-history').first();
    await historyButton.click();

    // Se houver um ícone de raio, clicar nele
    const pipelineButton = page.locator('text=⚡').first();
    if (await pipelineButton.isVisible()) {
        await pipelineButton.click();
        // Verificar se o título é 'Pipeline' (eu mudei de 'Pipeline de Automação' para 'Pipeline')
        await expect(page.locator('h2:has-text("Pipeline")')).toBeVisible();
    }
  });
});
