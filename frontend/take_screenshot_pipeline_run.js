import { chromium } from '@playwright/test';

async function run() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 900 });

    try {
        console.log("1. Acessando a página de login...");
        await page.goto('http://localhost:5173/login');
        await page.waitForLoadState('networkidle');

        console.log("2. Fazendo login...");
        const emailInput = page.locator('input[type="email"]');
        const passwordInput = page.locator('input[type="password"]');
        await emailInput.fill('');
        await emailInput.type('aryarajmarketing@gmail.com', { delay: 30 });
        await passwordInput.fill('');
        await passwordInput.type('123456', { delay: 30 });
        await page.locator('button[type="submit"]').click();

        console.log("3. Aguardando login e indo para Integrações...");
        await page.waitForURL('http://localhost:5173/');
        await page.goto('http://localhost:5173/integrations');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        console.log("4. Clicando no histórico do webhook para abrir a listagem de eventos...");
        const historyBtn = page.locator('button[title="Ver Histórico"], button:has-text("Histórico")').first();
        if (await historyBtn.count() > 0) {
            await historyBtn.click();
            await page.waitForTimeout(2000);
            
            console.log("5. Clicando em 'Ver Pipeline' de algum evento...");
            const pipelineBtn = page.locator('button[title="Ver Pipeline"], [title="Ver Pipeline"]').first();
            if (await pipelineBtn.count() > 0) {
                await pipelineBtn.click();
                await page.waitForTimeout(2000);
                
                console.log("6. Salvando screenshot do modal do pipeline com o botão de atualizar...");
                const screenshotPath = '/app/take_screenshot_pipeline.png';
                await page.screenshot({ path: screenshotPath, fullPage: false });
                console.log(`Screenshot salva com absoluto sucesso em: ${screenshotPath}`);
            } else {
                console.log("Aviso: Nenhum botão de 'Ver Pipeline' encontrado na tabela de histórico.");
            }
        } else {
            console.log("Aviso: Nenhum webhook com histórico ativo encontrado.");
        }

    } catch (error) {
        console.error("Erro durante a execução do Playwright:", error);
    } finally {
        await browser.close();
    }
}

run();
