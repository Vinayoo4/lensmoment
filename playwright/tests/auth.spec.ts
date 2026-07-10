import { test, expect } from '@playwright/test';

test('auth and dashboard loading', async ({ page }) => {
  // Go to login page
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Quantify/);

  // Perform login
  await page.fill('input[type="text"]', 'Alice');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');

  // Verify successful login by waiting for dashboard redirection
  await page.waitForURL('/dashboard');
  await expect(page.locator('text=Total KPIs Tracked')).toBeVisible();

  // Validate AI suggestions show up
  await expect(page.locator('text=AI Insights & Action Items')).toBeVisible();
});
