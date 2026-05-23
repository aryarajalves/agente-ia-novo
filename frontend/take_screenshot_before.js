import { chromium } from '@playwright/test';
import path from 'path';

async function run() {
    console.log("Iniciando Chromium para captura de Leads (Antes)...");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });

    try {
        console.log("1. Acessando a página de login...");
        await page.goto('http://localhost:5300/login', { timeout: 30000, waitUntil: 'load' });
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
        await page.waitForURL('http://localhost:5300/**', { timeout: 15000 });
        await page.waitForTimeout(4000);

        console.log("5. Navegando para Integrações...");
        await page.goto('http://localhost:5300/integrations', { timeout: 15000, waitUntil: 'load' });
        await page.waitForTimeout(3000);

        console.log("6. Clicando em Configurar Webhooks...");
        await page.locator('button:has-text("Configurar Webhooks")').first().click();
        await page.waitForTimeout(2000);

        console.log("7. Clicando no botão de Contatos...");
        await page.locator('.btn-action-leads, button:has-text("Contatos")').first().click();
        await page.waitForTimeout(3000);

        console.log("8. Salvando screenshot do modal de leads...");
        const screenshotPath = 'C:/Users/aryar/.gemini/antigravity/brain/4db7f358-c659-4fff-b920-f3a9b25bf52e/valida_leads_antes.png';
        await page.screenshot({ path: screenshotPath });
        console.log("Screenshot salva com sucesso em:", screenshotPath);
    } catch (error) {
        console.error("Erro na automação visual:", error);
    } finally {
        await browser.close();
    }
}

run();
