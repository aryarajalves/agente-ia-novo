import { chromium } from '@playwright/test';

async function run() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 900 });

    try {
        console.log("1. Acessando a página de login...");
        await page.goto('http://localhost:5173/login'); // Dentro do container o Vite roda em 5173
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

        console.log("4. Aguardando login e listagem de agentes...");
        await page.waitForURL('http://localhost:5173/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000); // Aguardar o fetch dos agentes terminar e renderizar

        console.log("5. Salvando screenshot da lista de agentes...");
        const screenshotPath = '/app/take_screenshot_gerenciamento.png';
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`Screenshot salva com absoluto sucesso em: ${screenshotPath}`);

    } catch (error) {
        console.error("Erro durante a execução do Playwright:", error);
    } finally {
        await browser.close();
    }
}

run();
