import { chromium } from '@playwright/test';
import path from 'path';

async function run() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });

    const brainDir = 'C:/Users/aryar/.gemini/antigravity/brain/5ef3015d-9fda-4bff-9f7f-72e9c53890f7';

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
        await page.waitForURL(url => url.href.includes('/admin') || url.href.endsWith(':5302/'));
        await page.waitForLoadState('networkidle');

        await page.waitForTimeout(1000);

        console.log("5. Salvando screenshot 1: Sidebar com novo botão");
        await page.screenshot({ path: path.resolve(brainDir, 'depois_sidebar.png') });

        console.log("6. Navegando para /ranking-duvidas...");
        await page.goto('http://localhost:5302/ranking-duvidas');

        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        console.log("7. Salvando screenshot 2: Dashboard de Objeções (Vazio ou Inicial)");
        await page.screenshot({ path: path.resolve(brainDir, 'depois_ranking_inicial.png') });

        console.log("8. Clicando em Recalcular/Atualizar Ranking...");
        // Clica no botão e aguarda para processar a clusterização
        await page.locator('button.objections-recalc-btn').first().click();
        await page.waitForTimeout(4000); // Dá um tempo para recalcular e renderizar

        console.log("9. Salvando screenshot 3: Dashboard de Objeções Carregado");
        await page.screenshot({ path: path.resolve(brainDir, 'depois_ranking_carregado.png') });

        // Verifica se existem cards renderizados para interagir
        const cardsCount = await page.locator('.objection-card').count();
        if (cardsCount > 0) {
            console.log(`Encontrado(s) ${cardsCount} card(s) de dúvidas. Interagindo com o primeiro...`);
            
            console.log("10. Clicando no primeiro card do ranking...");
            await page.locator('.objection-card-header').first().click();
            await page.waitForTimeout(1000);

            console.log("11. Salvando screenshot 4: Card de Dúvida Expandido");
            await page.screenshot({ path: path.resolve(brainDir, 'depois_ranking_expandido.png') });

            console.log("12. Clicando em Treinar Base de Conhecimento (RAG)...");
            await page.locator('.btn-objection-action.save-rag').first().click();
            await page.waitForTimeout(1000);

            console.log("13. Salvando screenshot 5: Modal RAG Aberto");
            await page.screenshot({ path: path.resolve(brainDir, 'depois_modal_rag.png') });
        } else {
            console.log("Não foram gerados clusters (pode ser falta de mensagens no banco de dados).");
        }

        console.log("Processo de screenshots de dúvidas concluído com absoluto sucesso!");

    } catch (error) {
        console.error("Erro durante a automação:", error);
    } finally {
        await browser.close();
    }
}

run();
