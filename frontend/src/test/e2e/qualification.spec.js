import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Lead Qualification Prompts UI E2E', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

    // Injeta a API URL local para evitar bloqueios do Cloudflare Tunnel no ambiente do Playwright
    await page.addInitScript(() => {
      window.configs = {
        VITE_API_URL: 'http://localhost:8002',
        VITE_AGENT_API_KEY: 'a0c10372-af47-4a36-932a-9b1acdb59366'
      };
    });

    // 1. Acessa a página de login
    await page.goto('http://localhost:5300/login');
    
    // Limpa os campos antes de digitar
    await page.fill('input[type="email"]', '');
    await page.fill('input[type="email"]', 'aryarajmarketing@gmail.com');
    
    await page.fill('input[type="password"]', '');
    await page.fill('input[type="password"]', '123456');
    
    await page.click('button[type="submit"]');
    
    // Aguarda carregar o dashboard
    await expect(page.locator('h1')).toContainText('Gerenciamento de Agentes');
  });

  test('Deve gerenciar perguntas qualificatórias com edição inline, instrução e modal de exclusão', async ({ page }) => {
    // 2. Acessa a tela de edição do primeiro agente listado
    const editBtn = page.locator('button:has-text("Configurar")').first();
    const hasAgent = await editBtn.isVisible();
    if (!hasAgent) {
      // Clica em Novo Agente
      const newAgentBtn = page.locator('text=+ Novo Agente');
      await expect(newAgentBtn).toBeVisible();
      await newAgentBtn.click();
      
      // Espera a URL mudar
      await page.waitForURL(/.*agent\/new.*/);
      
      // Clica na aba Geral para ver o formulario de criacao
      const geralTab = page.locator('button:has-text("Geral")');
      await expect(geralTab).toBeVisible();
      await geralTab.click();
      
      // Captura screenshot da inicializacao do novo agente para diagnostico na aba Geral
      const initScreenshotPath = path.resolve('C:/Users/aryar/.gemini/antigravity/brain/6373a2b7-7777-4829-aa94-e04815ffd1ea/visual_validation_new_agent_init.png');
      await page.screenshot({ path: initScreenshotPath, fullPage: true });
      console.log('Screenshot de inicializacao do novo agente salvo em:', initScreenshotPath);

      // Preenche o formulário do novo agente
      await page.fill('input[placeholder="Ex: Assistente de Vendas"]', 'Agente Teste Playwright');
      
      // Seleciona um modelo principal (primeira opção válida do select)
      await page.selectOption('select', { index: 1 });
      
      // Clica em criar agente
      await page.click('button:has-text("Criar Agente")');
      
      // Aguarda redirecionar de volta para o dashboard
      await page.waitForURL('http://localhost:5300/');
      
      // Garante que o botão de Editar está visível agora
      await expect(editBtn).toBeVisible({ timeout: 15000 });
    }
    await editBtn.click();

    // 3. Clica na aba Editor Prompt
    const promptsTab = page.locator('button:has-text("Editor Prompt")');
    await expect(promptsTab).toBeVisible();
    await promptsTab.click();

    // 4. Garante que a ferramenta 'lead_qualificado' está habilitada (se não, habilita)
    // Se a seção não estiver visível, vamos habilitar a ferramenta na aba Habilidades
    const isQualifSectionVisible = await page.locator('text=Lead Qualificado — Perguntas de Qualificação').isVisible();
    if (!isQualifSectionVisible) {
      const habilidadesTab = page.locator('button:has-text("Habilidades")');
      await habilidadesTab.click();
      
      const leadQualifCheckbox = page.locator('input[type="checkbox"]').locator('xpath=../..').locator('text=lead_qualificado');
      await leadQualifCheckbox.click();
      
      await promptsTab.click();
    }

    // 5. Adiciona uma nova pergunta
    const newQuestionInput = page.locator('input[placeholder="Ex: Qual é o seu nome completo?"]');
    await expect(newQuestionInput).toBeVisible();
    await newQuestionInput.fill('Qual sua cor preferida?');
    await page.click('button:has-text("Adicionar")');

    // 6. Verifica se a pergunta foi adicionada
    const lastQuestion = page.locator('.ignore-msg-item').last();
    await expect(lastQuestion).toContainText('Qual sua cor preferida?');

    // 7. Clica na pergunta para entrar no modo de edição inline
    const questionTextNode = lastQuestion.locator('.msg-text');
    await questionTextNode.click();

    // 8. Edita o texto da pergunta e adiciona uma instrução do agente no accordion
    const inlineInput = lastQuestion.locator('input[type="text"]');
    await inlineInput.fill('Qual sua cor preferida de verdade?');

    const instructionTextarea = lastQuestion.locator('textarea');
    await instructionTextarea.fill('Validar se o lead digitou azul, verde ou vermelho.');

    // Captura screenshot da edição inline com o accordion de instruções aberto
    const screenshotPath = path.resolve('C:/Users/aryar/.gemini/antigravity/brain/6373a2b7-7777-4829-aa94-e04815ffd1ea/visual_validation_editing.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Screenshot de edição salvo em:', screenshotPath);

    // 9. Salva a edição
    await lastQuestion.locator('button[title="Salvar alteração"]').click();

    // 10. Verifica se a pergunta foi atualizada e exibe o texto e a instrução salva
    await expect(lastQuestion).toContainText('Qual sua cor preferida de verdade?');
    await expect(lastQuestion).toContainText('↳ Instrução: Validar se o lead digitou azul, verde ou vermelho.');

    // 11. Clica na lixeira para excluir a pergunta
    const deleteBtn = lastQuestion.locator('button:has-text("🗑️")');
    await deleteBtn.click();

    // 12. Valida se o modal de confirmação no centro da tela abriu
    const modalTitle = page.locator('text=Confirmar Exclusão');
    await expect(modalTitle).toBeVisible();
    
    const modalDescription = page.locator('text=Você tem certeza que deseja apagar esta pergunta qualificatória?');
    await expect(modalDescription).toBeVisible();

    // Captura screenshot com o modal de exclusão aberto
    const modalScreenshotPath = path.resolve('C:/Users/aryar/.gemini/antigravity/brain/6373a2b7-7777-4829-aa94-e04815ffd1ea/visual_validation_modal.png');
    await page.screenshot({ path: modalScreenshotPath, fullPage: true });
    console.log('Screenshot do modal de exclusão salvo em:', modalScreenshotPath);

    // 13. Confirma a exclusão no modal
    await page.click('button:has-text("Sim, Apagar")');

    // 14. Garante que a pergunta foi excluída e não está mais na lista
    await expect(page.locator('text=Qual sua cor preferida de verdade?')).not.toBeVisible();
  });
});
