import { chromium } from '@playwright/test';
import path from 'path';

async function run() {
    console.log("Iniciando Chromium...");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 900 });

    try {
        console.log("Acessando login...");
        await page.goto('http://localhost:5176/login', { timeout: 30000, waitUntil: 'networkidle' });

        console.log("Limpando e preenchendo credenciais...");
        const emailInput = page.locator('input[type="email"]');
        const passwordInput = page.locator('input[type="password"]');

        await emailInput.fill('');
        await emailInput.type('aryarajmarketing@gmail.com', { delay: 50 });

        await passwordInput.fill('');
        await passwordInput.type('123456', { delay: 50 });

        console.log("Submetendo login...");
        await page.locator('button[type="submit"], button:has-text("Entrar")').first().click();

        console.log("Aguardando login e redirecionamento inicial...");
        await page.waitForTimeout(5000);

        console.log("Clicando na aba de Integrações no sidebar...");
        const integrationsTab = page.locator('button:has-text("Integrações")').first();
        await integrationsTab.waitFor({ timeout: 10000 });
        await integrationsTab.click();
        await page.waitForTimeout(2000);
        console.log("URL Atual:", page.url());

        // Vamos procurar pelo botão de nova integração ou título de integrações
        const newIntegrationBtn = page.locator('button:has-text("Nova")').first();
        await newIntegrationBtn.waitFor({ timeout: 10000 });
        console.log("Botão de Nova Integração encontrado. Clicando...");
        await newIntegrationBtn.click();
        await page.waitForTimeout(2000);

        console.log("Preenchendo nome de teste...");
        const nameInput = page.locator('input[placeholder*="Hotmart"]');
        await nameInput.fill('Integração de Teste Antigravity');
        await page.waitForTimeout(500);

        console.log("Clicando em Novo Gatilho...");
        const newTriggerBtn = page.locator('button:has-text("Novo Gatilho")');
        await newTriggerBtn.click();
        await page.waitForTimeout(1000);

        console.log("Expandindo primeiro gatilho...");
        const triggerHeader = page.locator('span:has-text("Gatilho #")').first();
        await triggerHeader.click();
        await page.waitForTimeout(2000);

        // Vamos interagir com o campo de tags internas para que ele apareça com tags adicionadas na screenshot
        console.log("Inserindo tags de teste...");
        const tagsInput = page.locator('input[placeholder*="Digite uma tag"]');
        await tagsInput.focus();
        await tagsInput.fill('lead_quente');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        await tagsInput.fill('vip');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        // Abre o dropdown de tags de sugestão para provar que funciona
        console.log("Focando novamente para abrir o dropdown de tags sugeridas...");
        await tagsInput.focus();
        await page.waitForTimeout(1000);

        const screenshotPath = path.resolve('C:/Users/aryar/.gemini/antigravity/brain/6a079873-2228-4893-8eec-3af4dedcd94b/screenshot_etiqueta_interna.png');
        console.log(`Tirando screenshot da nova interface de Mapeamento: ${screenshotPath}`);
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log("Screenshot salva com sucesso!");
    } catch (err) {
        console.error("Erro na automação de captura:", err);
        const errorScreenshotPath = path.resolve('C:/Users/aryar/.gemini/antigravity/brain/6a079873-2228-4893-8eec-3af4dedcd94b/error_screenshot.png');
        await page.screenshot({ path: errorScreenshotPath });
        console.log("Screenshot de erro salva em:", errorScreenshotPath);
    } finally {
        await browser.close();
    }
}

run();
