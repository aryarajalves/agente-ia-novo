import { chromium } from '@playwright/test';
import path from 'path';

async function run() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 900 });

    const brainDir = 'C:/Users/aryar/.gemini/antigravity/brain/a741e6cb-9dee-4666-9083-4d8398f56375';

    try {
        console.log("1. Acessando a página de login...");
        await page.goto('http://localhost:5302/login');
        await page.waitForLoadState('networkidle');

        console.log("2. Limpando e preenchendo campos de login...");
        const emailInput = page.locator('input[type="email"]');
        const passwordInput = page.locator('input[type="password"]');
        
        await emailInput.focus();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await emailInput.fill('');
        await emailInput.type('aryarajmarketing@gmail.com', { delay: 30 });
        
        await passwordInput.focus();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await passwordInput.fill('');
        await passwordInput.type('123456', { delay: 30 });

        console.log("3. Submetendo formulário...");
        await page.locator('button[type="submit"]').click();

        console.log("4. Aguardando login...");
        await page.waitForURL('http://localhost:5302/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        console.log("5. Navegando para a página de edição do agente (/agent/1)...");
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
            
            const agentLink = page.locator('a[href^="/agent/"], .agent-card, tr[onclick*="agent"]').first();
            if (await agentLink.count() > 0) {
                console.log("Clicando no agente encontrado na listagem...");
                await agentLink.click();
                await page.waitForLoadState('networkidle');
            } else {
                console.log("Nenhum agente listado. Indo para /agent/new...");
                await page.goto('http://localhost:5300/agent/new');
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

        console.log("8. No modal, clicando em 'dia_semana'...");
        const diaSemanaRow = page.locator('.var-row-item:has-text("dia_semana")');
        await diaSemanaRow.click();
        await page.waitForTimeout(500);

        console.log("9. Selecionando operador '=='...");
        await page.locator('select.cond-custom-select').nth(0).selectOption('==');
        await page.waitForTimeout(500);

        console.log("10. Escolhendo 'segunda-feira'...");
        await page.locator('select.cond-custom-select').nth(1).selectOption('segunda-feira');
        await page.waitForTimeout(500);

        console.log("11. Marcando a caixa de seleção de AND...");
        await page.locator('input.cond-checkbox').check();
        await page.waitForTimeout(500);

        console.log("12. Escolhendo a segunda variável como 'hora_atual'...");
        await page.locator('select.cond-custom-select').nth(2).selectOption('hora_atual');
        await page.waitForTimeout(500);

        console.log("13. Selecionando o operador '>='...");
        await page.locator('select.cond-custom-select').nth(3).selectOption('>=');
        await page.waitForTimeout(500);

        console.log("14. Definindo o valor '18:00'...");
        await page.locator('input.cond-custom-input').fill('18:00');
        await page.waitForTimeout(1000);

        console.log("15. Salvando screenshot da condicional combinada com o operador AND...");
        const screenshotPath = path.resolve(brainDir, 'condicional_combinada_and.png');
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`Screenshot salva com sucesso em: ${screenshotPath}`);

    } catch (error) {
        console.error("Erro durante a execução do Playwright:", error);
    } finally {
        await browser.close();
    }
}

run();
