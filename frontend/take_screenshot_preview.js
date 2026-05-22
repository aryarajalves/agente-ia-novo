import { chromium } from '@playwright/test';
import path from 'path';

async function run() {
    console.log("Iniciando Chromium para validação visual...");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });

    const brainDir = 'C:/Users/aryar/.gemini/antigravity/brain/0b2a2a3a-ed37-4123-96f6-00eaa2a56cda';
    const sampleImage = path.resolve('frontend/public/vite.svg'); // Usaremos o vite.svg como arquivo de upload

    try {
        console.log("1. Acessando a página de login...");
        await page.goto('http://127.0.0.1:5300/login', { timeout: 30000, waitUntil: 'load' });

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
        await page.locator('button[type="submit"]').click();

        console.log("4. Aguardando login...");
        await page.waitForURL('http://127.0.0.1:5300/', { timeout: 15000 });
        await page.waitForTimeout(2000);

        console.log("5. Navegando para o Playground / Laboratório...");
        // O Dashboard redireciona para a raiz. O playground geralmente está em /playground ou clicando no sidebar.
        // Vamos navegar direto para http://127.0.0.1:5300/playground
        await page.goto('http://127.0.0.1:5300/playground', { timeout: 15000, waitUntil: 'load' });
        await page.waitForTimeout(3000); // Aguarda carregar dados dos agentes

        console.log("6. Fazendo upload do arquivo de teste para acionar o preview de imagem...");
        // O input de arquivo é: <input type="file" style="display: none;" accept="image/*" />
        // Localizando o input de arquivo oculto no DOM
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(sampleImage);
        await page.waitForTimeout(2000); // Espera o preview carregar

        console.log("7. Salvando screenshot do preview de imagem...");
        const screenshotPath = path.resolve(brainDir, 'preview_imagem_depois.png');
        await page.screenshot({ path: screenshotPath });
        console.log("Screenshots salvos com absoluto sucesso em:", screenshotPath);

    } catch (error) {
        console.error("Erro durante a automação visual:", error);
    } finally {
        await browser.close();
    }
}

run();
