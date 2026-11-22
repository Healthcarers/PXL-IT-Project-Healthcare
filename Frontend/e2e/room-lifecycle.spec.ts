import { test, expect, type Page } from '@playwright/test';

async function createLectorRoom(page: Page): Promise<string> {
  await page.goto('/login');
  await page.fill('#email', 'lector@test.com');
  await page.fill('#password', 'test1234');
  await page.getByRole('button', { name: 'Login' }).click();

  const roomName = page.getByLabel('Naam van de room');
  const closeRoom = page.getByRole('button', { name: 'Room sluiten', exact: true });
  await expect(roomName.or(closeRoom)).toBeVisible({ timeout: 15000 });

  if (await closeRoom.isVisible()) {
    const started = /\/dashboard$/.test(new URL(page.url()).pathname);
    if (!started) {
      page.once('dialog', dialog => dialog.accept());
    }
    await closeRoom.click();
    if (started) {
      await page.getByRole('dialog', { name: 'Room sluiten?' })
        .getByRole('button', { name: 'Room sluiten' }).click();
    }
  }

  await expect(page).toHaveURL(/\/rooms\/new$/, { timeout: 15000 });
  await roomName.fill('Testroom');
  await page.getByLabel('Opdracht voor de cursisten').fill('Dit is een test');
  await page.getByRole('button', { name: 'Room aanmaken' }).click();

  await expect(page).toHaveURL(/\/host\/rooms\/[^/]+$/);
  await expect(page.getByRole('heading', { name: 'Testroom' })).toBeVisible();
  return new URL(page.url()).pathname.split('/').pop()!;
}

test.describe('Room Lifecycle E2E', () => {
  
  test('Cursist login and navigate to dashboard', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('#email', 'cursist@test.com');
    await page.fill('#password', 'test1234');
    
    const button = page.locator('button').filter({ hasText: 'Login' }).first();
    await button.click({ timeout: 10000 });

    await page.waitForTimeout(2000);
    const loginError = await page.locator('[class*="error"], [class*="red"]').textContent({ timeout: 1000 }).catch(() => null);
    if (loginError) {
      throw new Error(`Cursist login failed: ${loginError}`);
    }

    const url = page.url();
    expect(!url.includes('/login')).toBeTruthy();
    console.log('Cursist login successful, navigated to dashboard');
  });

  test.describe.serial('Lector room and cursist participation', () => {
    let roomCode: string;

    test('Lector login and create room', async ({ page }) => {
      test.setTimeout(45000);
      roomCode = await createLectorRoom(page);
    });

    test('Cursist joins the room created by the lector', async ({ page, browser }) => {
      test.setTimeout(60000);
      expect(roomCode, 'Run the lector room creation test before this test').toBeTruthy();

      await page.goto('/login');
      await page.fill('#email', 'cursist@test.com');
      await page.fill('#password', 'test1234');
      await page.getByRole('button', { name: 'Login' }).click();
      await expect(page).toHaveURL('/');

      await page.getByLabel('Deelnemen met een roomcode').fill(roomCode);
      await page.getByRole('button', { name: 'Room openen' }).click();
      await expect(page).toHaveURL(`/rooms/${roomCode}`);
      await expect(page.getByRole('heading', { name: 'Testroom' })).toBeVisible();
      await page.getByRole('button', { name: 'Deelnemen aan room' }).click();
      await expect(page.getByText('Je neemt deel aan deze room.')).toBeVisible();

      const lectorContext = await browser.newContext({ baseURL: new URL(page.url()).origin });
      try {
        const lector = await lectorContext.newPage();
        await lector.goto('/login');
        await lector.fill('#email', 'lector@test.com');
        await lector.fill('#password', 'test1234');
        await lector.getByRole('button', { name: 'Login' }).click();
        await expect(lector).toHaveURL(`/host/rooms/${roomCode}`, { timeout: 15000 });
        await expect(lector.getByRole('status', { name: 'Roomstatus' }))
          .toContainText('1 cursist in de room', { timeout: 20000 });
      } finally {
        await lectorContext.close();
      }
    });

    test('Lector starts the room with a scenario', async ({ page }) => {
      test.setTimeout(45000);
      expect(roomCode, 'Run the lector room creation test before this test').toBeTruthy();

      await page.goto('/login');
      await page.fill('#email', 'lector@test.com');
      await page.fill('#password', 'test1234');
      await page.getByRole('button', { name: 'Login' }).click();
      await expect(page).toHaveURL(`/host/rooms/${roomCode}`, { timeout: 15000 });
      await expect(page.getByRole('status', { name: 'Roomstatus' }))
        .toContainText('1 cursist in de room', { timeout: 20000 });

      const scenario = page.getByRole('combobox', { name: 'Scenario' });
      await expect(scenario).toBeEnabled();
      const firstScenario = scenario.locator('option:not([value=""])').first();
      await expect(firstScenario, 'Er moet een gepubliceerd scenario beschikbaar zijn').toHaveCount(1);
      const scenarioId = await firstScenario.getAttribute('value');
      expect(scenarioId).toBeTruthy();
      await scenario.selectOption(scenarioId!);
      await expect(scenario).toBeEnabled();

      await page.reload();
      await expect(scenario).toHaveValue(scenarioId!);
      await page.getByRole('button', { name: 'Simulatie starten' }).click();
      await page.getByRole('dialog', { name: 'Simulatie starten?' })
        .getByRole('button', { name: 'Simulatie starten' }).click();
      await expect(page).toHaveURL(`/host/rooms/${roomCode}/dashboard`);
      await expect(page.getByRole('region', { name: 'Parameters (realtime)' })).toBeVisible();
    });

    test('Cursist can display the graphs after the room starts', async ({ page }) => {
      test.setTimeout(45000);
      expect(roomCode, 'Run the preceding room lifecycle tests first').toBeTruthy();

      await page.goto('/login');
      await page.fill('#email', 'cursist@test.com');
      await page.fill('#password', 'test1234');
      await page.getByRole('button', { name: 'Login' }).click();
      await expect(page).toHaveURL('/');

      await page.getByLabel('Deelnemen met een roomcode').fill(roomCode);
      await page.getByRole('button', { name: 'Room openen' }).click();
      await expect(page).toHaveURL(`/monitor?code=${roomCode}`, { timeout: 15000 });

      for (const label of ['ECG II', 'Pleth', 'etCO2', 'Ibp']) {
        const card = page.getByText(label, { exact: true }).locator('..').locator('..');
        const graph = card.getByRole('button', { name: 'Start display' });
        await expect(graph).toBeVisible();
        await graph.click();
        const activeGraph = card.getByRole('button', { name: 'Stop display' });
        await expect(activeGraph).toHaveAttribute('aria-pressed', 'true');
        await expect(activeGraph.locator('canvas')).toBeVisible();
      }

      const temperature = page.getByRole('button', { name: 'Start temperatuur' });
      await expect(temperature).toBeVisible();
      await temperature.click();
      const activeTemperature = page.getByRole('button', { name: 'Stop temperatuur' });
      await expect(activeTemperature).toHaveAttribute('aria-pressed', 'true');
      await expect(activeTemperature).toContainText(/\d+\.\d/, { timeout: 15000 });
    });
  });
});
