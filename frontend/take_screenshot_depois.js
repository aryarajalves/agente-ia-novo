import { chromium } from '@playwright/test';
import path from 'path';

async function run() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });

    const brainDir = 'C:/Users/aryar/.gemini/antigravity/brain/676fda0e-1d5b-464c-b391-00f4722b2891';

    try {
        console.log("1. Acessando a página de login...");
        await page.goto('http://localhost:5300/login');
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
        await page.waitForURL('http://localhost:5300/');
        await page.waitForLoadState('networkidle');

        console.log("5. Navegando para /users...");
        await page.goto('http://localhost:5300/users');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        console.log("6. Salvando screenshot 1: Aba Usuários Ativos");
        await page.screenshot({ path: path.resolve(brainDir, 'depois_usuarios.png') });

        console.log("7. Clicando em + Novo Usuário para abrir aba de Convites e Modal...");
        await page.locator('button:has-text("+ Novo Usuário"), button.add-user-btn').click();
        await page.waitForTimeout(1000);

        console.log("8. Salvando screenshot 2: Modal Gerar Novo Convite");
        await page.screenshot({ path: path.resolve(brainDir, 'depois_modal_convite.png') });

        console.log("9. Preenchendo dados do convite e gerando...");
        await page.locator('#role-select').selectOption('Admin');
        await page.locator('#validity-select').selectOption('24');
        
        console.log("10. Submetendo formulário de convite...");
        await page.locator('button[type="submit"].modal-btn-confirm').click();
        await page.waitForTimeout(1500);

        console.log("11. Salvando screenshot 3: Convite Gerado com Link");
        await page.screenshot({ path: path.resolve(brainDir, 'depois_link_gerado.png') });

        const generatedLinkInput = page.locator('#generated-link');
        const generatedLink = await generatedLinkInput.inputValue();
        console.log(`Link gerado: ${generatedLink}`);

        console.log(`12. Navegando para o link de convite: ${generatedLink}`);
        await page.goto(generatedLink);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        console.log("13. Salvando screenshot 4: Tela Pública de Registro");
        await page.screenshot({ path: path.resolve(brainDir, 'depois_tela_registro.png') });

        console.log("14. Preenchendo registro com e-mail duplicado para testar validação...");
        await page.locator('input[placeholder="Seu nome completo"]').fill('Teste Convidado');
        
        const regEmailInput = page.locator('input[type="email"]');
        await regEmailInput.fill('aryarajmarketing@gmail.com');
        
        const regPasswordInput = page.locator('input[placeholder="Crie uma senha forte"]');
        await regPasswordInput.fill('123456');

        console.log("15. Clicando em Cadastrar (Email Duplicado)...");
        await page.locator('button[type="submit"]').click();
        await page.waitForTimeout(1500);

        console.log("16. Salvando screenshot 5: Erro de E-mail Duplicado");
        await page.screenshot({ path: path.resolve(brainDir, 'depois_erro_email.png') });

        console.log("17. Preenchendo com um e-mail único para cadastrar com sucesso...");
        const uniqueEmail = `convidado.${Date.now()}@gmail.com`;
        await regEmailInput.fill('');
        await regEmailInput.type(uniqueEmail, { delay: 20 });

        console.log("18. Clicando em Cadastrar (Sucesso)...");
        await page.locator('button[type="submit"]').click();
        
        console.log("19. Aguardando redirecionamento para login...");
        await page.waitForURL('**/login');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        console.log("20. Salvando screenshot 6: Tela de Login após Cadastro Concluído");
        await page.screenshot({ path: path.resolve(brainDir, 'depois_login_sucesso.png') });
        console.log("Processo E2E de validação e screenshots concluído com absoluto sucesso!");

    } catch (error) {
        console.error("Erro durante a automação:", error);
    } finally {
        await browser.close();
    }
}

run();
