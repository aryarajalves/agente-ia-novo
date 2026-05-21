import { chromium } from '@playwright/test';
import path from 'path';

async function run() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });

    const brainDir = 'C:/Users/aryar/.gemini/antigravity/brain/676fda0e-1d5b-464c-b391-00f4722b2891';

    try {
        console.log("1. Acessando a página de login...");
        await page.goto('http://localhost:5300/login');
        await page.waitForLoadState('networkidle');

        console.log("2. Limpando e preenchendo campos de login...");
        const emailInput = page.locator('input[type="email"]');
        const passwordInput = page.locator('input[type="password"]');
        
        await emailInput.fill('');
        await emailInput.type('aryarajmarketing@gmail.com', { delay: 30 });
        
        await passwordInput.fill('');
        await passwordInput.type('123456', { delay: 30 });

        console.log("3. Submetendo formulário...");
        await page.locator('button[type="submit"]').click();

        console.log("4. Aguardando login...");
        await page.waitForURL('http://localhost:5300/');
        await page.waitForLoadState('networkidle');

        console.log("5. Navegando para /users...");
        await page.goto('http://localhost:5300/users');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        console.log("6. Clicando na aba Convites Pendentes...");
        await page.locator('button.tab-btn:has-text("Convites Pendentes")').click();
        await page.waitForTimeout(1000);

        console.log("7. Clicando em + Gerar Convite...");
        await page.locator('button.add-user-btn:has-text("+ Gerar Convite")').click();
        await page.waitForTimeout(1000);

        console.log("8. Preenchendo dados do convite e gerando...");
        await page.locator('#role-select').selectOption('Admin');
        await page.locator('#validity-select').selectOption('24');
        await page.locator('button[type="submit"].modal-btn-confirm').click();
        await page.waitForTimeout(1500);

        console.log("9. Clicando no botão Copiar do Modal...");
        await page.locator('button:has-text("Copiar")').click();
        await page.waitForTimeout(500); // tempo para o Toast animar na tela

        console.log("10. Salvando screenshot: Toast de Copiar do Modal");
        await page.screenshot({ path: path.resolve(brainDir, 'depois_toast_modal.png') });

        console.log("11. Fechando o modal de convite...");
        await page.locator('button:has-text("Fechar")').click();
        await page.waitForTimeout(1000);

        console.log("12. Clicando no botão Copiar (ícone) na tabela de convites...");
        // Clica no primeiro botão de copiar na tabela
        await page.locator('table.users-table tbody tr.user-row').first().locator('button.action-btn.edit').click();
        await page.waitForTimeout(500); // tempo para o Toast animar na tela

        console.log("13. Salvando screenshot: Toast de Copiar da Tabela");
        await page.screenshot({ path: path.resolve(brainDir, 'depois_toast_tabela.png') });

        console.log("Processo concluído com sucesso!");

    } catch (error) {
        console.error("Erro durante a automação:", error);
    } finally {
        await browser.close();
    }
}

run();
