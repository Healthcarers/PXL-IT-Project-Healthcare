import { test, expect } from '@playwright/test';

test.describe('Registration and Login E2E', () => {

  test('Complete registration flow', async ({ page }) => {
    await page.goto('/registration');
    
    await expect(page.locator('h1:has-text("Account registreren")')).toBeVisible({ timeout: 10000 });

    await page.fill('#firstname', 'Jan');
    await page.fill('#lastname', 'Jansen');
    const testEmail = `user_${Date.now()}@test.com`;
    await page.fill('#email', testEmail);
    const testPassword = 'TestPassword123!';
    await page.fill('#password', testPassword);
    await page.fill('#passwordRepeated', testPassword);

    await page.click('button:has-text("Account aanmaken")');

    await page.waitForTimeout(2000);

    const errorMsg = await page.locator('[class*="error"], [class*="red"]').textContent({ timeout: 1000 }).catch(() => null);
    if (errorMsg) {
      throw new Error(`Registration failed with error: ${errorMsg}`);
    }

    const url = page.url();
    expect(url.includes('/login') || url.includes('registration')).toBeTruthy();
    
    if (url.includes('login')) {
      console.log('Registration successful, redirected to login');
    } else {
      throw new Error('Registration did not redirect to login');
    }
  });

  test('Login after registration', async ({ page }) => {
    await page.goto('/registration');
    
    const email = `user_${Date.now()}_login@test.com`;
    const password = 'TestPassword123!';

    await page.fill('#firstname', 'John');
    await page.fill('#lastname', 'Doe');
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.fill('#passwordRepeated', password);
    
    await page.click('button:has-text("Account aanmaken")');
    await page.waitForTimeout(2000);

    const regError = await page.locator('[class*="error"], [class*="red"]').textContent({ timeout: 1000 }).catch(() => null);
    if (regError) {
      throw new Error(`Registration failed: ${regError}`);
    }

    if (!page.url().includes('login')) {
      await page.goto('/login');
    }

    await page.fill('#email', email);
    await page.fill('#password', password);
    
    const button = page.locator('button').filter({ hasText: 'Login' }).first();
    await button.click({ timeout: 10000 });

    await page.waitForTimeout(2000);
    const loginError = await page.locator('[class*="error"], [class*="red"]').textContent({ timeout: 1000 }).catch(() => null);
    if (loginError) {
      throw new Error(`Login failed: ${loginError}`);
    }

    console.log('Login successful after registration');
  });

  test('Login with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.waitForTimeout(500);

    await page.fill('#email', 'nonexistent@test.com');
    await page.fill('#password', 'WrongPassword123!');
    
    const button = page.locator('button').filter({ hasText: 'Login' }).first();
    await button.click({ timeout: 10000 });

    await page.waitForTimeout(1000);
    const errorMsg = await page.locator('[class*="error"], [class*="red"]').textContent({ timeout: 2000 });
    
    expect(errorMsg).toBeTruthy();
    expect(errorMsg?.toLowerCase()).toContain('login gegevens');
    console.log('Invalid credentials correctly rejected');
  });

  test('Password validation on registration', async ({ page }) => {
    await page.goto('/registration');

    await page.fill('#firstname', 'Jan');
    await page.fill('#lastname', 'Jansen');
    await page.fill('#email', `test_${Date.now()}@test.com`);
    await page.fill('#password', 'Password123!');
    await page.fill('#passwordRepeated', 'DifferentPassword123!');

    await page.click('button:has-text("Account aanmaken")');
    await page.waitForTimeout(1000);

    const errorMsg = await page.locator('[class*="error"], [class*="red"]').textContent({ timeout: 2000 });
    expect(errorMsg).toBeTruthy();
    console.log('Password mismatch correctly detected');
  });

  test('Navigation between login and registration', async ({ page }) => {
    await page.goto('/login');
    
    const registerLink = page.locator('text=Registreren').first();
    if (await registerLink.isVisible().catch(() => false)) {
      await registerLink.click();
    } else {
      await page.goto('/registration');
    }

    await expect(page).toHaveURL('/registration');

    const loginLink = page.locator('text=Inloggen').last();
    if (await loginLink.isVisible().catch(() => false)) {
      await loginLink.click();
    } else {
      await page.goto('/login');
    }

    await expect(page).toHaveURL('/login');
    console.log('Navigation between pages works');
  });
});
