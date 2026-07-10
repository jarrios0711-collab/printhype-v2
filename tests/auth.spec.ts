import { test, expect } from '@playwright/test';

test.describe('PrintHype Authentication Flow', () => {
  test('should load landing page and display marketing details', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('PrintHype');
    await expect(page.getByRole('link', { name: 'ACCEDER AL PANEL' })).toBeVisible();
  });

  test('should fail login with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'wrong@jr3d.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]:has-text("Ingresar")');
    
    // Wait for redirect to page with error query param
    await expect(page).toHaveURL(/.*login\?error=.*/);
    await expect(page.locator('form').first()).toBeVisible();
  });

  test('should login successfully with test user and redirect to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@jr3d.com');
    await page.fill('input[name="password"]', 'printhypetest');
    await page.click('button[type="submit"]:has-text("Ingresar")');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 10000 });
    await expect(page.locator('h1')).toContainText(/Buen(as|os) (tardes|días|noches)/);
  });
});
