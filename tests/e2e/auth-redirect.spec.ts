import { test, expect } from '@playwright/test';

test.describe('Authentication Redirect (AC-01)', () => {
  test('AC-01 navigasi ke halaman privat tanpa session diarahkan ke /login', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/projects');
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.getByText('Masuk ke Aplikasi')).toBeVisible();
    await expect(page.getByLabel('Alamat email')).toBeVisible();
    await expect(page.getByLabel('Kata sandi')).toBeVisible();
  });

  test('Halaman login memiliki form dan tombol masuk', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Masuk' })).toBeVisible();
  });
});
