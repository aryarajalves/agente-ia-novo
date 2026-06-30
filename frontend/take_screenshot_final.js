import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

async function run() {
    console.log("Iniciando Chromium para captura visual...");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });

    const brainDir = 'C:/Users/aryar/.gemini/antigravity/brain/d2b20411-041c-457e-8197-6fd572c6f6f9';

    try {
        console.log("1. Acessando a página de login...");
        await page.goto('http://localhost:5302/login', { timeout: 30000, waitUntil: 'load' });
        await page.waitForTimeout(1000);

        console.log("2. Limpando e preenchendo campos de login...");
        const emailInput = page.locator('input[type="email"]');
        const passwordInput = page.locator('input[type="password"]');
        
        await emailInput.focus();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await emailInput.type('aryarajmarketing@gmail.com', { delay: 20 });
        
        await passwordInput.focus();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await passwordInput.type('123456', { delay: 20 });

        console.log("3. Submetendo formulário...");
        await page.locator('button[type="submit"], button.login-btn-primary').first().click();

        console.log("4. Aguardando login...");
        await page.waitForURL('http://localhost:5302/**', { timeout: 15000 });
        await page.waitForTimeout(3000);

        console.log("5. Navegando para o Playground...");
        await page.goto('http://localhost:5302/playground', { timeout: 15000, waitUntil: 'load' });
        await page.waitForTimeout(3000); // Aguarda carregar dados

        console.log("6. Enviando mensagem no chat playground...");
        const textarea = page.locator('textarea[placeholder^="Digite sua mensagem"], textarea.input-textarea-custom').first();
        await textarea.fill('Qual o seu nome?');
        await page.keyboard.press('Enter');
        
        console.log("7. Aguardando a resposta da IA...");
        await page.waitForTimeout(5000); // Espera 5 segundos para a resposta e gravação no banco de dados

        console.log("8. Clicando no botão Raio-X...");
        await page.locator('button:has-text("🔍 Raio-X")').last().click();
        await page.waitForTimeout(1000);

        console.log("9. Clicando em Visualizar Prompt Final do Sistema...");
        await page.locator('button:has-text("📝 Visualizar Prompt Final")').last().click();
        await page.waitForTimeout(1500);

        console.log("10. Capturando screenshot da aba activa inicial (Prompt Estático)...");
        await page.screenshot({ path: path.resolve(brainDir, 'valida_tabs_estatico.png') });

        console.log("11. Clicando na aba Blocos Dinâmicos (Condicionais)...");
        await page.locator('button:has-text("⚡ Blocos Dinâmicos")').click();
        await page.waitForTimeout(1000);

        console.log("12. Capturando screenshot da aba activa (Blocos Dinâmicos)...");
        await page.screenshot({ path: path.resolve(brainDir, 'valida_tabs_dinamico.png') });

        console.log("Processo concluído com sucesso!");

    } catch (error) {
        console.error("Erro durante a automação visual:", error);
    } finally {
        await browser.close();
    }
}

run();
