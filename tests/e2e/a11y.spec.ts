import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Aksesibilitas WCAG AA (axe-core)', () => {
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
