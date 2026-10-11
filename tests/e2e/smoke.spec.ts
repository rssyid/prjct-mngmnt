import { test, expect } from '@playwright/test';

test.describe('WM Project Management — Smoke & Navigation E2E', () => {
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

  test('Memuat halaman Dashboard dengan KPI dan daftar deviasi', async ({ page }) => {
    await page.goto('/');

    // Verifikasi judul dan KPI
    await expect(page.locator('h1')).toContainText('Dashboard Portofolio Water Management');
    await expect(page.getByText('Total Proyek')).toBeVisible();
    await expect(page.locator('body')).toContainText('65,4%'); // Progres rata-rata
    await expect(page.getByText('Peringatan Dini (EWS)')).toBeVisible();

    // Verifikasi tabel deviasi
    await expect(page.getByText('Deviasi Progres Terhadap Baseline')).toBeVisible();
    await expect(page.locator('body')).toContainText('WM-THIP-2026-0001');
  });

  test('Navigasi ke Daftar Proyek dan interaksi role switcher', async ({ page }) => {
    await page.goto('/projects');

    await expect(page.locator('h1')).toContainText('Daftar Proyek Water Management');
    await expect(page.locator('body')).toContainText('WM-THIP-2026-0001');

    // Default Super Admin: Tombol "Buat Proyek Baru" aktif
    const createBtn = page.getByRole('button', { name: /Buat Proyek/i });
    await expect(createBtn).toBeEnabled();

    // Ganti role ke MANAGEMENT_VIEWER
    const roleSelect = page.getByLabel('Pilih peran pengguna simulasi');
    await roleSelect.selectOption('MANAGEMENT_VIEWER');

    // Banner read-only muncul
    await expect(
      page.getByText(/Melihat antarmuka sebagai Management Viewer/i),
    ).toBeVisible();

    // Tombol buat proyek menjadi dinonaktifkan
    await expect(page.getByRole('button', { name: /Viewer Terkunci/i })).toBeDisabled();
  });

  test('Membuka Workspace Proyek dan tab navigasi', async ({ page }) => {
    await page.goto('/projects/proj-1');

    await expect(page.locator('body')).toContainText('WM-THIP-2026-0001');
    await expect(page.getByText('Langkah Berikutnya')).toBeVisible();

    // Cek tab Ringkasan aktif
    await expect(page.getByText('Data Pokok Proyek')).toBeVisible();

    // Pindah ke tab Jadwal (Gantt)
    await page.getByRole('tab', { name: 'Jadwal (Gantt)' }).click();
    await expect(page.getByText('Gantt Matriks Mingguan Proyek')).toBeVisible();
    await expect(page.getByText('Legenda Warna & Simbol Gantt Matriks').first()).toBeVisible();
  });

  test('Membuka Portofolio Gantt dan verifikasi legenda warna', async ({ page }) => {
    await page.goto('/portfolio');

    await expect(page.locator('h1')).toContainText('Portofolio Gantt Matriks Mingguan');
    await expect(page.getByText('Hierarki Pekerjaan & Proses')).toBeVisible();

    // Pada viewport mobile 375px, klik tombol Legenda untuk membuka panel legenda
    const legendBtn = page.getByRole('button', { name: 'Legenda' });
    if (await legendBtn.isVisible()) {
      await legendBtn.click();
    }

    await expect(page.getByText('Baseline (Awal)').first()).toBeVisible();
    await expect(page.getByText('Revisi Jadwal #1').first()).toBeVisible();
  });
});
