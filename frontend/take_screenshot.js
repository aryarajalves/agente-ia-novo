import { chromium } from '@playwright/test';
import path from 'path';

async function run() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });

    try {
        console.log("Acessando a página de login...");
        await page.goto('http://localhost:5300/login');
        await page.waitForLoadState('networkidle');

        // Limpar os campos antes de digitar (Regra acesso-sistema.md)
        console.log("Limpando e preenchendo campos de login...");
        const emailInput = page.locator('input[type="email"]');
        const passwordInput = page.locator('input[type="password"]');
        
        await emailInput.fill('');
        await emailInput.type('aryarajmarketing@gmail.com', { delay: 50 });
        
        await passwordInput.fill('');
        await passwordInput.type('123456', { delay: 50 });

        console.log("Submetendo formulário...");
        await page.locator('button[type="submit"]').click();

        // Aguardar login e navegação
        console.log("Aguardando login...");
        await page.waitForURL('http://localhost:5300/');
        await page.waitForLoadState('networkidle');

        // Navegar para a página de usuários
        console.log("Navegando para /users...");
        await page.goto('http://localhost:5300/users');
        await page.waitForLoadState('networkidle');

        // Clicar em "+ Novo Usuário"
        console.log("Abrindo popup de novo usuário...");
        await page.locator('button:has-text("+ Novo Usuário"), button.add-user-btn').click();
        await page.waitForTimeout(1000); // Aguardar animação do modal

        // Tirar screenshot
        const screenshotPath = path.resolve('C:/Users/aryar/.gemini/antigravity/brain/676fda0e-1d5b-464c-b391-00f4722b2891/antes.png');
        console.log(`Tirando screenshot do antes e salvando em: ${screenshotPath}`);
        await page.screenshot({ path: screenshotPath });
        console.log("Screenshot do antes salva com sucesso.");
    } catch (error) {
        console.error("Erro durante o processo:", error);
    } finally {
        await browser.close();
    }
}

run();
