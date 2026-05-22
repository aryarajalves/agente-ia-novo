import { chromium } from '@playwright/test';
import path from 'path';

async function run() {
    console.log("Iniciando Chromium...");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });

    const brainDir = 'C:/Users/aryar/.gemini/antigravity/brain/02b1e5b5-4fd4-446a-89f4-b8ba1bc1af0c';

    try {
        console.log("1. Acessando a página de login...");
        await page.goto('http://127.0.0.1:5300/login', { timeout: 15000, waitUntil: 'load' });

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
        await page.waitForURL('http://127.0.0.1:5300/', { timeout: 15000 });
        await page.waitForTimeout(3000); // Dar um tempo extra para renderizar tudo

        console.log("5. Salvando screenshot: Dashboard de Agentes");
        const outPath = path.resolve(brainDir, 'screenshot_val_final_handoff.png');
        await page.screenshot({ path: outPath });
        console.log("Screenshots salvos com absoluto sucesso em:", outPath);

    } catch (error) {
        console.error("Erro durante a automação:", error);
    } finally {
        await browser.close();
    }
}

run();
