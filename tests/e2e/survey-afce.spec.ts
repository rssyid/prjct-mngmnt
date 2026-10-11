import { test, expect } from '@playwright/test';

test.describe('Fase F2 — Proyek, Survei, AFCE & Matriks Approval E2E', () => {
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

  test('AC-11 Memuat halaman daftar proyek dengan filter region dan pencarian', async ({ page }) => {
    await page.goto('/projects');

    await expect(page.locator('h1')).toContainText('Daftar Proyek Water Management');
    await expect(page.getByLabel('Filter Region')).toBeVisible();
    await expect(page.getByLabel('Filter Status Proyek')).toBeVisible();
    await expect(page.getByPlaceholder('Cari kode atau nama proyek...')).toBeVisible();
  });

  test('AC-10 Menampilkan dialog buat proyek baru dengan validasi master select', async ({ page }) => {
    await page.goto('/projects');

    const createBtn = page.getByRole('button', { name: /Buat Proyek Baru/i });
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // Dialog muncul
    await expect(page.getByText('Buat Proyek Water Management Baru')).toBeVisible();
    await expect(page.getByLabel('Nama Proyek *')).toBeVisible();
    await expect(page.getByLabel('Company (PT) *')).toBeVisible();
    await expect(page.getByLabel('Kategori Proyek *')).toBeVisible();
  });

  test('AC-18 & D-22 Super Admin dapat mengakses halaman konfigurasi Matriks Approval', async ({ page }) => {
    // Route me mengembalikan SUPER_ADMIN
    await page.route('/api/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'admin_1',
            name: 'Super Admin Test',
            email: 'admin@wm.local',
            role: 'SUPER_ADMIN',
            isActive: true,
          },
        }),
      });
    });

    await page.goto('/admin/approval-matrix');

    await expect(page.locator('h1')).toContainText('Konfigurasi Matriks Approval SAP');
    await expect(page.getByRole('button', { name: /Tambah Tier Baru/i })).toBeVisible();
  });

  test('Workspace Proyek menampilkan tab Ringkasan, Survei, AFCE, Anggaran, dan Riwayat', async ({ page }) => {
    // Mock project data
    await page.route('/api/projects/proj-test-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'proj-test-1',
            code: 'WM-THIP-2026-0001',
            name: 'Rehabilitasi Saluran Tanggul',
            status: 'RAB_READY',
            targetStartDate: '2026-11-01',
            targetEndDate: '2027-02-28',
            plannedBudget: '1200000000',
            notes: 'Catatan proyek uji',
            company: { id: 'c1', name: 'PT THIP', code: 'THIP' },
            category: { id: 'cat1', name: 'Rehabilitasi', code: 'REHAB' },
            picUser: { id: 'u1', name: 'Ahmad PIC', email: 'pic@wm.local' },
            estates: [
              {
                estateId: 'e1',
                isPrimary: true,
                estate: { id: 'e1', name: 'Estate Mandah', code: 'MND' },
              },
            ],
          },
        }),
      });
    });

    await page.route('/api/projects/proj-test-1/survey', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            surveyStartDate: '2026-10-01',
            surveyEndDate: '2026-10-05',
            surveyCompletedAt: '2026-10-05',
            gisLayersUrl: 'https://gis.example.com/layer1',
            notes: 'Hasil survei lengkap',
          },
        }),
      });
    });

    await page.route('/api/projects/proj-test-1/afce-attempts', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [],
        }),
      });
    });

    await page.route('/api/projects/proj-test-1/budget', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            plannedBudget: '1200000000',
            totalOfficialBudget: '0',
            initialEntry: null,
            arEntries: [],
            entries: [],
          },
        }),
      });
    });

    await page.route('/api/projects/proj-test-1/history', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'h1',
              fromStatus: 'DRAFT',
              toStatus: 'SURVEY',
              reason: 'Mulai survei',
              createdAt: '2026-10-01T08:00:00Z',
              changedBy: { id: 'u1', name: 'Admin', email: 'admin@wm.local' },
            },
            {
              id: 'h2',
              fromStatus: 'SURVEY',
              toStatus: 'RAB_READY',
              reason: 'Survei tuntas',
              createdAt: '2026-10-05T10:00:00Z',
              changedBy: { id: 'u1', name: 'Admin', email: 'admin@wm.local' },
            },
          ],
        }),
      });
    });

    await page.goto('/projects/proj-test-1');

    // Verifikasi header
    await expect(page.locator('body')).toContainText('WM-THIP-2026-0001');
    await expect(page.getByText('Proyek: RAB Ready')).toBeVisible();

    // Verifikasi tab navigasi
    await expect(page.getByRole('tab', { name: 'Ringkasan' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Survei & Peta' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'AFCE & Approval' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Anggaran & AR' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Riwayat Status' })).toBeVisible();

    // Buka tab Survei & Peta
    await page.getByRole('tab', { name: 'Survei & Peta' }).click();
    await expect(page.getByText('Hasil Survei Lapangan (Selesai)')).toBeVisible();
    await expect(page.getByText('Survei Tuntas')).toBeVisible();

    // Buka tab Anggaran & AR
    await page.getByRole('tab', { name: 'Anggaran & AR' }).click();
    await expect(page.getByText('Ringkasan Anggaran Proyek')).toBeVisible();
    await expect(page.getByText('Penambahan Anggaran Resmi (AR Tambahan)')).toBeVisible();

    // Buka tab Riwayat Status
    await page.getByRole('tab', { name: 'Riwayat Status' }).click();
    await expect(page.getByText('Riwayat Perubahan Status Proyek')).toBeVisible();
    await expect(page.getByText('Survei tuntas')).toBeVisible();
  });
});
