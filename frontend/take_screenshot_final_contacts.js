import { chromium } from '@playwright/test';
import path from 'path';

async function run() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });

    const brainDir = 'C:/Users/aryar/.gemini/antigravity/brain/8d2b83d1-c83a-4618-8cec-444f2307f5b0';

    try {
        console.log("1. Acessando a página de login...");
        await page.goto('http://127.0.0.1:5302/login');
        await page.waitForLoadState('networkidle');

        console.log("2. Limpando e preenchendo campos de login...");
        const emailInput = page.locator('input[type="email"]');
        const passwordInput = page.locator('input[type="password"]');
        
        await emailInput.focus();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await emailInput.type('aryarajmarketing@gmail.com', { delay: 30 });
        
        await passwordInput.focus();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await passwordInput.type('123456', { delay: 30 });

        console.log("3. Submetendo formulário...");
        await page.locator('button[type="submit"]').click();

        console.log("4. Aguardando login...");
        await page.waitForURL('http://127.0.0.1:5302/');
        await page.waitForLoadState('networkidle');

        console.log("5. Navegando para /webhooks...");
        await page.goto('http://127.0.0.1:5302/webhooks');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        console.log("6. Salvando screenshot: Página de Configuração de Webhooks");
        const destination = path.resolve(brainDir, 'screenshot_val_final.png');
        await page.screenshot({ path: destination, fullPage: true });
        console.log(`Screenshot salvo com sucesso em: ${destination}`);

    } catch (error) {
        console.error("Erro durante a automação:", error);
    } finally {
        await browser.close();
    }
}

run();
