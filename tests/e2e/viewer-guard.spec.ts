import { test, expect } from '@playwright/test';

test.describe('Viewer Action Guard (AC-02)', () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: 'dummy_session_token',
        domain: '127.0.0.1',
        path: '/',
      },
    ]);
  });

  test('AC-02 Viewer melihat antarmuka tanpa tombol aksi mutasi di Master Data', async ({ page }) => {
    // Simulasi response /api/me mengembalikan role MANAGEMENT_VIEWER
    await page.route('/api/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'viewer_1',
            name: 'Viewer Pengamat',
            email: 'viewer@wm.local',
            role: 'MANAGEMENT_VIEWER',
            isActive: true,
          },
        }),
      });
    });

    await page.goto('/master');

    await expect(page.locator('h1')).toContainText('Master Data');
    // Tombol "+ Tambah Data" tidak boleh muncul untuk Viewer
    await expect(page.getByRole('button', { name: '+ Tambah Data' })).not.toBeVisible();
    // Kolom aksi tidak boleh muncul
    await expect(page.getByRole('columnheader', { name: 'Aksi' })).not.toBeVisible();
  });
});
