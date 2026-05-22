import { chromium } from '@playwright/test';
import path from 'path';

async function run() {
    console.log("Iniciando Chromium...");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });

    const brainDir = 'C:/Users/aryar/.gemini/antigravity/brain/676fda0e-1d5b-464c-b391-00f4722b2891';

    try {
        console.log("1. Acessando a página de login...");
        await page.goto('http://localhost:5300/login', { timeout: 15000, waitUntil: 'load' });

        console.log("2. Limpando e preenchendo campos de login...");
        const emailInput = page.locator('input[type="email"]');
        const passwordInput = page.locator('input[type="password"]');
        
        await emailInput.focus();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await emailInput.type('aryarajmarketing@gmail.com', { delay: 20 });
        
        await passwordInput.focus();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await passwordInput.type('123456', { delay: 20 });

        console.log("3. Submetendo formulário...");
        await page.locator('button[type="submit"]').click();

        console.log("4. Aguardando login...");
        await page.waitForURL('http://localhost:5300/', { timeout: 10000 });
        await page.waitForTimeout(2000);

        console.log("5. Salvando screenshot: Dashboard de Agentes");
        await page.screenshot({ path: path.resolve(brainDir, 'screenshot_val_final.png') });
        console.log("Screenshots salvos com absoluto sucesso em:", path.resolve(brainDir, 'screenshot_val_final.png'));

    } catch (error) {
        console.error("Erro durante a automação:", error);
    } finally {
        await browser.close();
    }
}

run();
