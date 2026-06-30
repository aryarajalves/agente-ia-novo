import { chromium } from '@playwright/test';
import path from 'path';

async function run() {
    console.log("Iniciando Chromium para captura de Backups (Depois)...");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 1000 });

    try {
        console.log("1. Acessando a página de login...");
        await page.goto('http://127.0.0.1:5302/login', { timeout: 30000, waitUntil: 'load' });
        await page.waitForTimeout(2000);

        console.log("2. Preenchendo campos de login...");
        const emailInput = page.locator('input[type="email"]');
        const passwordInput = page.locator('input[type="password"]');
        
        await emailInput.focus();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await emailInput.fill('aryarajmarketing@gmail.com');
        
        await passwordInput.focus();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await passwordInput.fill('123456');

        console.log("3. Clicando no botão de login...");
        await page.locator('button[type="submit"], button:has-text("Entrar")').first().click();

        console.log("4. Aguardando login...");
        await page.waitForURL('http://127.0.0.1:5302/**', { timeout: 15000 });
        await page.waitForTimeout(4000);

        console.log("5. Navegando para Backups...");
        await page.goto('http://127.0.0.1:5302/backups', { timeout: 15000, waitUntil: 'load' });
        await page.waitForTimeout(4000);

        console.log("6. Salvando screenshot do painel de backups...");
        const screenshotPath = 'C:/Users/aryar/.gemini/antigravity/brain/d2b20411-041c-457e-8197-6fd572c6f6f9/valida_backups_depois.png';
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log("Screenshot salva com sucesso em:", screenshotPath);
    } catch (error) {
        console.error("Erro na automação visual:", error);
    } finally {
        await browser.close();
    }
}

run();
