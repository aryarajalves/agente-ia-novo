import { chromium } from '@playwright/test';
import path from 'path';

async function run() {
    console.log("Iniciando Chromium para captura do PromptEditor...");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 900 });

    const brainDir = 'C:/Users/aryar/.gemini/antigravity/brain/78a779b3-95a9-43af-b7bf-d1d08be84b0b';

    try {
        console.log("1. Acessando a página de login...");
        await page.goto('http://localhost:5302/login', { timeout: 30000 });
        await page.waitForTimeout(2000);

        console.log("2. Limpando e preenchendo campos de login...");
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

        console.log("3. Submetendo formulário...");
        await page.locator('button[type="submit"]').click();
        await page.waitForTimeout(4000);

        console.log("4. Navegando para o agente...");
        // Tenta ir para agent/1 diretamente
        await page.goto('http://localhost:5302/agent/1', { timeout: 30000 });
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Se redirecionar ou não estiver na página de edição, tenta ir pelo dashboard
        const url = page.url();
        if (url.includes('/login') || !url.includes('/agent/')) {
            console.log("Redirecionando para o dashboard...");
            await page.goto('http://localhost:5302/');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);
            
            // Clica no primeiro agente que encontrar ou cria um novo
            const agentLink = page.locator('a[href^="/agent/"], .agent-card, tr[onclick*="agent"]').first();
            if (await agentLink.count() > 0) {
                await agentLink.click();
                await page.waitForLoadState('networkidle');
            } else {
                await page.goto('http://localhost:5302/agent/new');
                await page.waitForLoadState('networkidle');
            }
        }

        console.log("5. Clicando na aba do Editor de Prompt...");
        const promptTab = page.locator('button:has-text("Editor Prompt"), .tab-btn:has-text("Editor Prompt"), [data-tab="prompts"]').first();
        await promptTab.click();
        await page.waitForTimeout(2000);

        console.log("6. Clicando em 'Inserir Condicional'...");
        const insertCondBtn = page.locator('button:has-text("Inserir Condicional"), .insert-cond-btn').first();
        await insertCondBtn.click();
        await page.waitForTimeout(2000);

        console.log("7. Clicando em 'data_atual' para abrir configuração...");
        const varItem = page.locator('div.var-row-item:has-text("data_atual")').first();
        if (await varItem.count() > 0) {
            await varItem.click();
            await page.waitForTimeout(2000);
        }

        console.log("8. Salvando screenshot do modal com o novo campo de título da condicional...");
        const screenshotPath = path.resolve(brainDir, 'depois.png');
        await page.screenshot({ path: screenshotPath });
        console.log(`Screenshot salva com sucesso em: ${screenshotPath}`);

    } catch (error) {
        console.error("Erro durante a execução do Playwright:", error);
    } finally {
        await browser.close();
    }
}

run();
