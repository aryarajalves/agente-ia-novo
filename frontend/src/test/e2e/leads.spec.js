import { test, expect } from '@playwright/test';

test.describe('Leads Management E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login antes de cada teste
    await page.goto('http://localhost:5300/login');
    await page.fill('input[type="email"]', 'aryarajmarketing@gmail.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    
    // Aguarda carregar o dashboard
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('Should open Contatos modal and show metadata', async ({ page }) => {
    // Navega para Integrações
    await page.click('a[href="/integrations"]');
    await expect(page).toHaveURL(/.*integrations/);

    // Espera carregar a lista de webhooks
    const webhookCard = page.locator('.webhook-card').first();
    await expect(webhookCard).toBeVisible();

    // Clica no botão "Contatos" (usando id ou texto)
    const contatosBtn = webhookCard.locator('button:has-text("Contatos")');
    await expect(contatosBtn).toBeVisible();
    await contatosBtn.click();

    // Verifica se o modal "Contatos Capturados" abriu
    const modalTitle = page.locator('h2:has-text("Contatos Capturados")');
    await expect(modalTitle).toBeVisible();

    // Verifica se existe pelo menos um lead na lista
    const leadCard = page.locator('.lead-card-premium').first();
    await expect(leadCard).toBeVisible();

    // Clica no lead para expandir (Dica: Clique no contato para ver detalhes)
    await leadCard.click();

    // Verifica se os metadados expandidos estão visíveis
    await expect(page.locator('text=CONTA ID')).toBeVisible();
    await expect(page.locator('text=CONTATO ID')).toBeVisible();
    await expect(page.locator('text=INBOX ID')).toBeVisible();
    await expect(page.locator('text=CONVERSA ID')).toBeVisible();
    
    // Verifica se o cronômetro está rodando (contém o ícone ⏰ e o texto "Aberta")
    const timerBadge = page.locator('text=⏰ Aberta');
    await expect(timerBadge).toBeVisible();
  });

  test('Should filter leads by phone number', async ({ page }) => {
    await page.click('a[href="/integrations"]');
    const contatosBtn = page.locator('button:has-text("Contatos")').first();
    await contatosBtn.click();

    const searchInput = page.locator('input[placeholder="Nome ou número..."]');
    await searchInput.fill('558596123586');
    await page.click('button:has-text("Filtrar")');

    // Verifica se o resultado filtrado aparece
    await expect(page.locator('text=558596123586')).toBeVisible();
  });
});
