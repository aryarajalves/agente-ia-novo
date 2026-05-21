import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Lead Scoring E2E e Maximização de Diretrizes', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

    // Injeta a API URL local para evitar bloqueios do Cloudflare Tunnel no ambiente do Playwright
    await page.addInitScript(() => {
      window.configs = {
        VITE_API_URL: 'http://localhost:8002',
        VITE_AGENT_API_KEY: 'a0c10372-af47-4a36-932a-9b1acdb59366'
      };
    });

    // 1. Acessa a página de login
    await page.goto('http://localhost:5300/login');
    
    // Limpa os campos antes de digitar (Regra de acesso)
    await page.fill('input[type="email"]', '');
    await page.fill('input[type="email"]', 'aryarajmarketing@gmail.com');
    
    await page.fill('input[type="password"]', '');
    await page.fill('input[type="password"]', '123456');
    
    await page.click('button[type="submit"]');
    
    // Aguarda carregar o dashboard
    await expect(page.locator('h1')).toContainText('Gerenciamento de Agentes');
  });

  test('Deve visualizar listagem de leads, badge do agente, popup de exclusão e maximização das diretrizes', async ({ page }) => {
    // === PARTE 1: Tela de Lead Scoring ===
    console.log("Navegando para a página de Lead Scoring...");
    await page.goto('http://localhost:5300/lead-scoring');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Aguarda renderizar leads se existirem

    // Tira print da listagem de leads qualificados mostrando o badge do agente qualificador
    const listScreenshotPath = path.resolve('C:/Users/aryar/.gemini/antigravity/brain/a20a0b87-a848-4612-aca1-462603619dbe/leads_listagem.png');
    await page.screenshot({ path: listScreenshotPath, fullPage: true });
    console.log('Screenshot da listagem de leads qualificados salvo em:', listScreenshotPath);

    // Se houver algum card de lead listado
    const leadCard = page.locator('.lead-card-modern, .lead-card').first();
    const hasLead = await leadCard.isVisible();
    if (hasLead) {
      // 1. Clicar no botão de lixeira para desqualificar o lead
      console.log("Lead encontrado. Clicando na lixeira...");
      const deleteBtn = page.locator('button[title*="Remover qualificação"], button[title*="Excluir"], .btn-action-delete, .delete-btn').first();
      await deleteBtn.click();
      await page.waitForTimeout(500); // Aguarda transição do modal

      // 2. Tirar screenshot do popup de confirmação de exclusão Premium (centralizado, backdrop escuro)
      const deleteModalScreenshotPath = path.resolve('C:/Users/aryar/.gemini/antigravity/brain/a20a0b87-a848-4612-aca1-462603619dbe/leads_modal_exclusao.png');
      await page.screenshot({ path: deleteModalScreenshotPath, fullPage: true });
      console.log('Screenshot do modal de confirmação de exclusão salvo em:', deleteModalScreenshotPath);

      // 3. Fechar modal clicando em cancelar/fechar
      console.log("Cancelando a exclusão...");
      const cancelBtn = page.locator('button:has-text("Cancelar"), button:has-text("Fechar"), .btn-secondary').first();
      await cancelBtn.click();
      await page.waitForTimeout(500);
    } else {
      console.log("Nenhum lead qualificado encontrado para interagir com a lixeira.");
    }

    // === PARTE 2: Maximização de Diretrizes ===
    console.log("Navegando para o painel de configuração do primeiro agente...");
    await page.goto('http://localhost:5300/');
    await page.waitForLoadState('networkidle');
    
    const editBtn = page.locator('button:has-text("Configurar")').first();
    await editBtn.click();
    await page.waitForLoadState('networkidle');

    // Clica na aba Editor Prompt
    const promptsTab = page.locator('button:has-text("Editor Prompt")');
    await expect(promptsTab).toBeVisible();
    await promptsTab.click();
    await page.waitForTimeout(1000);

    // Encontra o botão de maximizar diretrizes de lead scoring
    console.log("Buscando botão de maximizar diretrizes...");
    const maximizeBtn = page.locator('button[title*="Maximizar"], button:has-text("Maximizar"), .btn-maximize').first();
    const hasMaximizeBtn = await maximizeBtn.isVisible();
    
    if (hasMaximizeBtn) {
      console.log("Botão de maximizar diretrizes encontrado! Clicando...");
      await maximizeBtn.click();
      await page.waitForTimeout(1000); // Aguarda modal abrir

      // Tirar screenshot do modal maximizado de diretrizes (80% da tela)
      const maximizeModalScreenshotPath = path.resolve('C:/Users/aryar/.gemini/antigravity/brain/a20a0b87-a848-4612-aca1-462603619dbe/leads_modal_diretrizes_maximizadas.png');
      await page.screenshot({ path: maximizeModalScreenshotPath, fullPage: true });
      console.log('Screenshot do modal de diretrizes maximizado salvo em:', maximizeModalScreenshotPath);

      // Clicar em Fechar no modal
      console.log("Fechando o modal de maximização...");
      const closeBtn = page.locator('button:has-text("Concluído"), button:has-text("Fechar"), .close-modal-btn').first();
      await closeBtn.click();
      await page.waitForTimeout(500);
    } else {
      console.log("Botão de maximizar diretrizes de lead scoring não encontrado.");
    }
  });
});
