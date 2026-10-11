import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Aksesibilitas WCAG AA (axe-core)', () => {
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

  test('Dashboard bebas dari pelanggaran kritis aksesibilitas WCAG AA', async ({ page }) => {
    await page.goto('/');
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Daftar Proyek bebas dari pelanggaran kritis aksesibilitas WCAG AA', async ({ page }) => {
    await page.goto('/projects');
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Portofolio Gantt bebas dari pelanggaran kritis aksesibilitas WCAG AA', async ({ page }) => {
    await page.goto('/portfolio');
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
