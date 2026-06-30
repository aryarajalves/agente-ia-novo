import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function run() {
    console.log("Starting browser...");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();

    console.log("Navigating to http://localhost:5302...");
    await page.goto('http://localhost:5302');

    // Wait for the login form to load
    await page.waitForSelector('input[type="email"]');

    console.log("Clearing and filling login fields...");
    // Clear fields first (as per rule acesso-sistema.md)
    await page.fill('input[type="email"]', '');
    await page.fill('input[type="password"]', '');
    
    // Type credentials
    await page.type('input[type="email"]', 'aryarajmarketing@gmail.com');
    await page.type('input[type="password"]', '123456');

    console.log("Submitting login form...");
    await page.click('button.login-btn-primary');

    // Wait for navigation / sidebar to load
    console.log("Waiting for main dashboard page...");
    await page.waitForSelector('aside.sidebar');

    console.log("Navigating to integrations page...");
    await page.click('a[href="/integrations"]');
    await page.waitForSelector('.webhook-list-grid');

    // Find our Webhook Teste card
    console.log("Finding Webhook Teste card...");
    const card = page.locator('.webhook-card-modern', { hasText: 'Webhook Teste' });
    await card.waitFor();

    console.log("Clicking 'Contatos' button on the card...");
    await card.locator('.btn-action-leads').click();

    console.log("Waiting for Leads modal...");
    await page.waitForSelector('.premium-modal-overlay');

    console.log("Finding Lead 'Aryaraj Teste' and opening history...");
    const leadRow = page.locator('div', { hasText: 'Aryaraj Teste' }).first();
    await leadRow.waitFor();
    
    // Click the "💬 Histórico" button in the lead details
    await page.click('button.btn-action-history');

    console.log("Waiting for LeadHistoryModal to load...");
    // Wait for the lead history modal table
    await page.waitForSelector('table');

    console.log("Finding pipeline event and clicking Ver Pipeline (⚡) button...");
    // Click the ⚡ button in the table actions
    await page.click('button[title="Ver Pipeline"]');

    console.log("Waiting for AutomationPipelineModal...");
    // Wait for the pipeline modal to open (z-index 1100, displays "Pipeline")
    await page.waitForSelector('h2:has-text("Pipeline")');

    // Wait 2 seconds for visual stabilization
    console.log("Waiting for modal to stabilize...");
    await page.waitForTimeout(2000);

    // Verify detailed badges exist: CACHED and IN Cobrado
    console.log("Validating detailed cache/billed badges...");
    const cachedBadge = page.locator('span:has-text("CACHED")');
    const billedBadge = page.locator('span:has-text("IN Cobrado")');
    
    const cachedExists = await cachedBadge.count() > 0;
    const billedExists = await billedBadge.count() > 0;
    
    console.log(`Validation results: cached badge exists: ${cachedExists}, billed badge exists: ${billedExists}`);

    // Create target directory if it doesn't exist
    const screenshotDir = 'C:\\Users\\aryar\\.gemini\\antigravity\\brain\\1552ae3f-8361-4355-829f-f7c5ca882771';
    if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
    }
    const screenshotPath = path.join(screenshotDir, 'visual_validation_pipeline.png');

    console.log(`Taking screenshot and saving to ${screenshotPath}...`);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    console.log("Browser task completed successfully.");
    await browser.close();
}

run().catch(err => {
    console.error("Error occurred during browser automation:", err);
    process.exit(1);
});
