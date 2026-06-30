import { chromium } from '@playwright/test';
import path from 'path';

async function run() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 1000 });

    const brainDir = 'C:/Users/aryar/.gemini/antigravity/brain/8ec969bb-af6d-4c77-96d9-78385a3ae2ba';
    const ports = ['5302', '5300'];
    let connectedPort = null;

    try {
        // Tentar conectar nas portas disponíveis usando 127.0.0.1 para evitar problemas com IPv6 ::1
        for (const port of ports) {
            try {
                console.log(`Tentando conectar na porta ${port}...`);
                await page.goto(`http://127.0.0.1:${port}/login`, { timeout: 5000 });
                connectedPort = port;
                console.log(`Conectado com sucesso na porta ${connectedPort}!`);
                break;
            } catch (err) {
                console.log(`Porta ${port} indisponível: ${err.message}`);
            }
        }

        if (!connectedPort) {
            throw new Error("Nenhuma porta (5300 ou 5302) respondeu ao acesso via 127.0.0.1.");
        }

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
        await page.waitForURL(`http://127.0.0.1:${connectedPort}/`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        console.log("5. Navegando para a página de edição do agente (/agent/1)...");
        await page.goto(`http://127.0.0.1:${connectedPort}/agent/1`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        const url = page.url();
        if (url.includes('/login') || !url.includes('/agent/')) {
            console.log("Não foi possível acessar /agent/1 diretamente. Tentando pelo painel principal...");
            await page.goto(`http://127.0.0.1:${connectedPort}/`);
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1000);
            
            const agentLink = page.locator('a[href^="/agent/"], .agent-card, tr[onclick*="agent"]').first();
            if (await agentLink.count() > 0) {
                console.log("Clicando no agente encontrado na listagem...");
                await agentLink.click();
                await page.waitForLoadState('networkidle');
            } else {
                console.log("Nenhum agente listado. Indo para /agent/new...");
                await page.goto(`http://127.0.0.1:${connectedPort}/agent/new`);
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
        await page.waitForTimeout(1500); // Aguardar abertura do modal

        console.log("8. No modal, selecionando a variável temporal 'dia_semana'...");
        const diaSemanaRow = page.locator('.var-row-item:has-text("dia_semana"), [title*="dia_semana"]').first();
        await diaSemanaRow.click();
        await page.waitForTimeout(500);

        console.log("9. No campo de Resposta se a Condição Principal for Verdadeira, digitando 'Mensagem se for segunda'...");
        const trueInput = page.locator('textarea#cond-true-text-input');
        await trueInput.focus();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await trueInput.fill('Mensagem se for segunda');
        await page.waitForTimeout(500);

        console.log("10. Clicando no botão '+ Adicionar Bloco ELSEIF'...");
        const addElifBtn = page.locator('button:has-text("Adicionar Bloco ELSEIF"), .add-elif-btn');
        await addElifBtn.click();
        await page.waitForTimeout(500);

        console.log("11. No bloco ELSEIF criado, selecionando a variável 'hora_atual'...");
        const elifBlocks = page.locator('.elif-block-item');
        const firstElifBlock = elifBlocks.first();
        
        const elifVarSelect = firstElifBlock.locator('select').first();
        await elifVarSelect.selectOption('hora_atual');
        await page.waitForTimeout(500);

        console.log("12. Selecionando o operador '>=' no bloco ELSEIF...");
        const elifOpSelect = firstElifBlock.locator('select').nth(1);
        await elifOpSelect.selectOption('>=');
        await page.waitForTimeout(500);

        console.log("13. Definindo o valor '18:00' no bloco ELSEIF...");
        const elifValInput = firstElifBlock.locator('input.cond-custom-input');
        await elifValInput.fill('18:00');
        await page.waitForTimeout(500);

        console.log("14. Digitando 'Fim do expediente' na Resposta para este ELSEIF...");
        const elifTextarea = firstElifBlock.locator('textarea');
        await elifTextarea.fill('Fim do expediente');
        await page.waitForTimeout(500);

        console.log("15. Na Resposta Padrão Alternativa (ELSE), digitando 'Outro dia'...");
        const falseInput = page.locator('textarea#cond-false-text-input');
        await falseInput.focus();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await falseInput.fill('Outro dia');
        await page.waitForTimeout(1000);

        console.log("16. Capturando screenshot da interface completa...");
        const screenshotPath = path.resolve(brainDir, 'condicionais_fluxo_multiplo.png');
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`Screenshot salva com absoluto sucesso em: ${screenshotPath}`);

    } catch (error) {
        console.error("Erro durante a execução do Playwright:", error);
    } finally {
        await browser.close();
    }
}

run();
