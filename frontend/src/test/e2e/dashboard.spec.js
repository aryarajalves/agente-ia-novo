import { test, expect } from '@playwright/test';

test('Dashboard should load and have clickable buttons', async ({ page }) => {
  await page.goto('/');

  // Verifica se o título principal está visível
  await expect(page.locator('h1')).toContainText('Gerenciamento de Agentes');

  // Verifica se o botão de "Novo Agente" está presente
  const newAgentBtn = page.locator('text=+ Novo Agente');
  await expect(newAgentBtn).toBeVisible();

  // Tenta clicar no botão e vê se navega (não vamos salvar nada)
  await newAgentBtn.click();
  await expect(page).toHaveURL(/.*agent\/new/);
});

test('Should not have a blue screen (ErrorBoundary check)', async ({ page }) => {
  await page.goto('/');
  
  // Se o ErrorBoundary disparar, o texto abaixo estaria na tela
  const errorText = page.locator('text=Ops! Algo deu errado.');
  await expect(errorText).not.toBeVisible();
});
