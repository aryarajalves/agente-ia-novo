import { chromium } from '@playwright/test';
import path from 'path';

async function run() {
    console.log("Iniciando Playwright Chromium...");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });

    const brainDir = 'C:/Users/aryar/.gemini/antigravity/brain/08edc6f0-b21a-45f6-abf1-a66dc5e6b7dc';
    const screenshotPath = path.resolve(brainDir, 'screenshot_depois_audio.png');

    try {
        console.log("1. Acessando a página de login...");
        await page.goto('http://localhost:5173/login');
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

        console.log("4. Aguardando login e redirecionamento para o dashboard...");
        await page.waitForURL('http://localhost:5173/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        // Se houver uma lista de agentes, clicar no primeiro agente para carregar o chat
        console.log("5. Verificando se há agentes para abrir o chat...");
        const agentCard = page.locator('.agent-card, [class*="agent-card"], button:has-text("Conversar"), a:has-text("Playground")').first();
        if (await agentCard.count() > 0) {
            console.log("Selecionando o primeiro agente...");
            await agentCard.click();
            await page.waitForTimeout(2000);
        }

        console.log("6. Salvando captura de tela final do chat...");
        await page.screenshot({ path: screenshotPath });
        console.log("Screenshot do chat salvo com sucesso em:", screenshotPath);

    } catch (error) {
        console.error("Erro durante a captura de tela:", error);
    } finally {
        await browser.close();
    }
}

run();
