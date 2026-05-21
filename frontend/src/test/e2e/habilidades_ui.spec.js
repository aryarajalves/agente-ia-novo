import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Habilidades UI Verification E2E', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

    // Injeta a API URL local para evitar bloqueios do Cloudflare Tunnel
    await page.addInitScript(() => {
      window.configs = {
        VITE_API_URL: 'http://localhost:8002',
        VITE_AGENT_API_KEY: 'a0c10372-af47-4a36-932a-9b1acdb59366'
      };
    });

    // 1. Acessa a página de login
    await page.goto('http://localhost:5300/login');
    
    // Limpa e preenche
    await page.fill('input[type="email"]', '');
    await page.fill('input[type="email"]', 'aryarajmarketing@gmail.com');
    
    await page.fill('input[type="password"]', '');
    await page.fill('input[type="password"]', '123456');
    
    await page.click('button[type="submit"]');
    
    // Aguarda carregar o dashboard
    await expect(page.locator('h1')).toContainText('Gerenciamento de Agentes');
  });

  test('Deve verificar que transferir_robo nao esta no dropdown de Habilidades', async ({ page }) => {
    // 2. Acessa a tela de edição do primeiro agente
    const editBtn = page.locator('button:has-text("Configurar")').first();
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();

    // 3. Clica na aba Habilidades
    const habilidadesTab = page.locator('button:has-text("Habilidades")');
    await expect(habilidadesTab).toBeVisible({ timeout: 10000 });
    await habilidadesTab.click();

    // 4. Aguarda o select de habilidades carregar
    const select = page.locator('select').last();
    await expect(select).toBeVisible();

    // Clica no select para abri-lo
    await select.focus();

    // 5. Tira o screenshot da aba
    const screenshotPath = path.resolve('C:/Users/aryar/.gemini/antigravity/brain/f41fddd3-e6a1-42b5-bb6f-b982c71bae69/habilidades_dropdown_check.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Screenshot salvo em:', screenshotPath);

    // 6. Assegura que transferir_robo nao existe na listagem do select
    const selectContent = await select.innerHTML();
    expect(selectContent).not.toContain('transferir_robo');
  });
});
