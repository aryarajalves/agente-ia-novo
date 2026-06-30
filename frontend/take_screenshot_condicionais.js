import { chromium } from '@playwright/test';
import path from 'path';

async function run() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 900 });

    const brainDir = 'C:/Users/aryar/.gemini/antigravity/brain/68ff6ee3-041b-40d2-929c-7deb52e74f4d';

    try {
        console.log("1. Acessando a página de login...");
        await page.goto('http://localhost:5302/login');
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
        await page.waitForURL('http://localhost:5302/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        console.log("5. Navegando para a página de edição do agente (/agent/1)...");
        // Tentaremos ir diretamente para o primeiro agente
        await page.goto('http://localhost:5302/agent/1');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // Se por acaso não estiver na página de edição ou deu 404, vamos voltar e tentar encontrar o link
        const url = page.url();
        if (url.includes('/login') || !url.includes('/agent/')) {
            console.log("Não foi possível acessar /agent/1 diretamente. Tentando pelo painel principal...");
            await page.goto('http://localhost:5302/');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1000);
            
            // Tenta clicar no primeiro card ou link de agente
            const agentLink = page.locator('a[href^="/agent/"], .agent-card, tr[onclick*="agent"]').first();
            if (await agentLink.count() > 0) {
                console.log("Clicando no agente encontrado na listagem...");
                await agentLink.click();
                await page.waitForLoadState('networkidle');
            } else {
                console.log("Nenhum agente listado. Indo para /agent/new...");
                await page.goto('http://localhost:5302/agent/new');
                await page.waitForLoadState('networkidle');
            }
        }

        console.log("6. Clicando na aba do Editor de Prompt (Editor Prompt)...");
        const promptTab = page.locator('button:has-text("Editor Prompt"), .tab-btn:has-text("Editor Prompt"), [data-tab="prompts"]');
        await promptTab.click();
        await page.waitForTimeout(1000);

        console.log("7. Clicando em 'Inserir Condicional'...");
        const insertCondBtn = page.locator('button:has-text("Inserir Condicional"), .insert-cond-btn');
        await insertCondBtn.click();
        await page.waitForTimeout(1500); // Aguardar animação de abertura do modal

        console.log("8. Salvando screenshot do estado visual da tela...");
        const screenshotPath = path.resolve(brainDir, 'condicionais_estado_visual.png');
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`Screenshot salva com absoluto sucesso em: ${screenshotPath}`);

    } catch (error) {
        console.error("Erro durante a execução do Playwright:", error);
    } finally {
        await browser.close();
    }
}

run();
