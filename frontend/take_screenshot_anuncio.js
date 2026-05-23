import { chromium } from '@playwright/test';
import path from 'path';

async function run() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });

    page.on('console', msg => console.log(`[PAGE CONSOLE] ${msg.type()}: ${msg.text()}`));
    
    page.on('requestfailed', request => {
        console.log(`[PAGE REQ FAIL] ${request.method()} ${request.url()}: ${request.failure()?.errorText}`);
    });
    
    page.on('response', response => {
        if (response.status() >= 400) {
            console.log(`[PAGE HTTP ERROR] ${response.status()} ${response.url()}`);
        }
    });

    const brainDir = 'C:/Users/aryar/.gemini/antigravity/brain/38f2c77c-4aef-4957-8ca4-feb84f31b281';

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
        await page.waitForTimeout(2000);

        console.log("5. Salvando screenshot do Dashboard Principal...");
        await page.screenshot({ path: path.resolve(brainDir, 'depois_dashboard.png') });
        console.log("Screenshot tirado com sucesso e salvo em depois_dashboard.png!");

    } catch (error) {
        console.error("Erro durante a automação visual:", error);
    } finally {
        await browser.close();
    }
}

run();
