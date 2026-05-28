import { test, expect } from '@playwright/test';

test.describe('Quantify Suite PWA E2E', () => {
  const baseURL = 'http://localhost:5173';

  test('should load app shell and allow registration/login', async ({ page }) => {
    // Navigate to Login page
    await page.goto(baseURL);
    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();

    // Register a new user
    const uniqueUser = `testuser_${Date.now()}`;
    await page.getByLabel('Username').fill(uniqueUser);
    await page.getByLabel('Password').fill('testpass123');
    await page.getByRole('button', { name: "Don't have an account? Register" }).click();

    // Wait for navigation to dashboard
    await expect(page.getByRole('heading', { name: 'Quantify Suite' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();

    // Test persistent login
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Quantify Suite' })).toBeVisible();

    // Fill KPI
    await page.getByRole('combobox').first().selectOption('k_traffic');
    await page.getByRole('spinbutton').first().fill('120');
    await page.getByRole('button', { name: 'Save Entry' }).click();

    // Fill Transaction
    await page.getByRole('spinbutton').nth(1).fill('-400');
    await page.getByRole('textbox').first().fill('Test hardware');
    await page.getByRole('button', { name: 'Save Transaction' }).click();

    // Logout
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
  });
});
