import { chromium } from '@playwright/test';
import path from 'path';

async function run() {
    console.log("Iniciando Chromium para captura de Leads...");
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

        console.log("8. Tirando screenshot de todos os leads (com os novos badges)...");
        await page.screenshot({ path: 'C:/Users/aryar/.gemini/antigravity/brain/5777647d-6b1a-40af-b879-35bc59733efe/1_leads_todos.png' });
        console.log("Screenshot '1_leads_todos.png' salva com sucesso.");

        console.log("9. Filtrando por 'Sem Mensagens'...");
        await page.locator('select').nth(2).selectOption('true');
        await page.waitForTimeout(1000);
        await page.locator('button:has-text("Filtrar")').click();
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'C:/Users/aryar/.gemini/antigravity/brain/5777647d-6b1a-40af-b879-35bc59733efe/2_leads_sem_mensagem.png' });
        console.log("Screenshot '2_leads_sem_mensagem.png' salva com sucesso.");

        console.log("10. Filtrando por 'Com Mensagens'...");
        await page.locator('select').nth(2).selectOption('false');
        await page.waitForTimeout(1000);
        await page.locator('button:has-text("Filtrar")').click();
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'C:/Users/aryar/.gemini/antigravity/brain/5777647d-6b1a-40af-b879-35bc59733efe/3_leads_com_mensagem.png' });
        console.log("Screenshot '3_leads_com_mensagem.png' salva com sucesso.");

    } catch (error) {
        console.error("Erro na automação visual:", error);
    } finally {
        await browser.close();
    }
}

run();
