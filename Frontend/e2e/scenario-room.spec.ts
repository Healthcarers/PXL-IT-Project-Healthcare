import { test, expect } from '@playwright/test';

test.describe('Scenario and Test Room E2E', () => {
  test('Lector can navigate to scenarios page', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('#email', 'lector@test.com');
    await page.fill('#password', 'test1234');
    
    const button = page.locator('button').filter({ hasText: 'Login' }).first();
    await button.click({ timeout: 10000 });

    await page.waitForTimeout(2000);

    await page.goto('/scenarios');
    
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    console.log('Lector accessed scenarios page');
  });

  test('Lector can create a scenario with vitals and feedback', async ({ page }) => {
    const title = `E2E testscenario ${Date.now()}`;
    const description = 'Beschrijving van het testscenario';
    const feedback = 'Controleer het hartritme';
    const vitals = [
      ['HF (bpm)', '82'],
      ['SpO₂ (%)', '96'],
      ['etCO₂ (mmHg)', '35'],
      ['Systolische invasieve bloeddruk (mmHg)', '125'],
      ['Diastolische invasieve bloeddruk (mmHg)', '78'],
      ['AF (/min)', '16'],
      ['Amplitude', '1.2'],
      ['Temperatuur (°C)', '37.2'],
    ];

    await page.goto('/login');
    await page.fill('#email', 'lector@test.com');
    await page.fill('#password', 'test1234');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL(/\/(?:rooms\/new|host\/rooms\/[^/]+(?:\/dashboard)?)$/, { timeout: 15000 });
    await page.goto('/scenarios');
    await page.getByRole('link', { name: 'Scenario toevoegen' }).click();
    await expect(page).toHaveURL('/scenarios/new');

    await page.getByLabel('Titel *').fill(title);
    await page.getByLabel('Beschrijving *').fill(description);
    for (const [label, value] of vitals) {
      await page.getByLabel(label, { exact: true }).fill(value);
    }
    await page.getByLabel('Nieuw feedbackitem').fill(feedback);
    await page.getByRole('button', { name: 'Toevoegen', exact: true }).click();
    await expect(page.getByRole('list', { name: 'Feedbackitems' })).toContainText(feedback);
    await page.getByRole('button', { name: 'Opslaan als concept' }).click();
    await expect(page.getByRole('status')).toHaveText('Scenario opgeslagen als concept.');

    await page.getByRole('link', { name: 'Terug naar overzicht' }).click();
    await page.getByRole('link', { name: `Bewerk scenario: ${title}` }).click();
    await expect(page.getByLabel('Titel *')).toHaveValue(title);
    await expect(page.getByLabel('Beschrijving *')).toHaveValue(description);
    for (const [label, value] of vitals) {
      await expect(page.getByLabel(label, { exact: true })).toHaveValue(value);
    }
    await expect(page.getByRole('list', { name: 'Feedbackitems' })).toContainText(feedback);
  });
});

