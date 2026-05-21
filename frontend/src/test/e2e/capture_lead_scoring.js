import { chromium } from '@playwright/test';
import path from 'path';

async function capture() {
  console.log('Iniciando o navegador Chromium...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Define o tamanho da tela para um formato premium
  await page.setViewportSize({ width: 1440, height: 900 });

  try {
    console.log('Navegando para a tela de Login...');
    await page.goto('http://127.0.0.1:5300/login');

    // 1. Limpar campos de login e preencher (obrigatório pelas regras de acesso)
    console.log('Preenchendo credenciais...');
    
    const emailInput = page.locator('input[type="email"]');
    await emailInput.focus();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await emailInput.fill('aryarajmarketing@gmail.com');

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.focus();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await passwordInput.fill('123456');

    // Clicar no botão de entrar
    console.log('Submetendo login...');
    await page.click('button[type="submit"]');

    // Esperar redirecionar
    console.log('Aguardando redirecionamento para o dashboard...');
    await page.waitForURL(/.*dashboard|.*\//, { timeout: 15000 });

    // Navegar para Lead Scoring
    console.log('Navegando para Lead Scoring...');
    await page.goto('http://127.0.0.1:5300/lead-scoring');

    // Esperar o container do lead-scoring
    console.log('Aguardando o carregamento da página de Lead Scoring...');
    await page.waitForSelector('.lead-scoring-title', { timeout: 15000 });

    // Esperar um pouco pelo carregamento dos leads da API
    await page.waitForTimeout(3000);

    // Se houver cards de lead na tela, expandir o primeiro para exibir respostas e justificativa
    const firstHeader = page.locator('.lead-card-header').first();
    if (await firstHeader.count() > 0) {
      console.log('Expandindo o primeiro lead da lista para capturar respostas e justificativa...');
      await firstHeader.click();
      await page.waitForTimeout(1000); // Aguardar renderização das respostas
    } else {
      console.log('Aviso: Nenhum lead foi retornado pelo backend na listagem.');
    }

    // Definir o caminho de salvamento do screenshot nos artefatos do Antigravity
    const screenshotPath = 'C:/Users/aryar/.gemini/antigravity/brain/abb48b64-374c-4f08-8320-a3138ad169b6/lead_scoring_screenshot.png';
    
    console.log('Capturando screenshot da interface...');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`[OK] Screenshot salvo com sucesso em: ${screenshotPath}`);

  } catch (error) {
    console.error('Erro na captura do teste visual:', error);
  } finally {
    await browser.close();
    console.log('Navegador encerrado.');
  }
}

capture();
