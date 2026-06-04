import { test, expect } from '@playwright/test';

test.describe('PrintHype Dashboard Navigation and Verification', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@jr3d.com');
    await page.fill('input[name="password"]', 'printhypetest');
    await page.click('button[type="submit"]:has-text("Ingresar")');
    await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 10000 });
  });

  test('should display summary dashboard metrics and activity', async ({ page }) => {
    // Validate main statistics cards
    await expect(page.locator('text=PEDIDOS HOY')).toBeVisible();
    await expect(page.locator('text=COMPLETADOS')).toBeVisible();
    await expect(page.locator('text=IMPRESORAS')).toBeVisible();
    await expect(page.locator('text=STOCK CRÍTICO').first()).toBeVisible();
  });

  test('should navigate to Pedidos (Orders) page', async ({ page }) => {
    await page.click('text=Pedidos');
    await expect(page).toHaveURL(/.*dashboard\/orders.*/);
    await expect(page.locator('input[placeholder*="Buscar"]')).toBeVisible();
  });

  test('should navigate to Inventario (Inventory) page', async ({ page }) => {
    await page.click('text=Inventario');
    await expect(page).toHaveURL(/.*dashboard\/inventory.*/);
  });

  test('should navigate to AI Lab page', async ({ page }) => {
    await page.click('text=AI Lab');
    await expect(page).toHaveURL(/.*dashboard\/ai-lab.*/);
    await expect(page.locator('text=Consola de IA')).toBeVisible();
  });

  test('should navigate to Viral Cockpit page', async ({ page }) => {
    await page.click('text=Viral Cockpit');
    await expect(page).toHaveURL(/.*dashboard\/viral.*/);
  });

  test('should navigate to Proyectos (Projects) page', async ({ page }) => {
    await page.click('text=Proyectos');
    await expect(page).toHaveURL(/.*dashboard\/projects.*/);
  });

  test('should navigate to Ajustes (Settings) page', async ({ page }) => {
    await page.click('text=Ajustes');
    await expect(page).toHaveURL(/.*dashboard\/settings.*/);
  });
});
