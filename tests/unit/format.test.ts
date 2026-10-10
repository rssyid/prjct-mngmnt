import { describe, it, expect } from 'vitest';
import { formatCurrency, formatPercent, formatDate } from '@/shared/lib/format';

describe('Indonesian Formatting Utilities', () => {
  it('formatCurrency memformat nominal ke format Rupiah tanpa spasi', () => {
    expect(formatCurrency(1250000000)).toBe('Rp1.250.000.000');
    expect(formatCurrency('500000')).toBe('Rp500.000');
    expect(formatCurrency(0)).toBe('Rp0');
  });

  it('formatPercent memformat angka desimal ke persen dengan koma', () => {
    expect(formatPercent(65.4)).toBe('65,4%');
    expect(formatPercent(100)).toBe('100,0%');
    expect(formatPercent('59.0')).toBe('59,0%');
  });

  it('formatDate memformat tanggal ke format d MMM yyyy bahasa Indonesia', () => {
    const sampleDate = new Date(2026, 9, 10); // 10 Oktober 2026
    expect(formatDate(sampleDate)).toBe('10 Okt 2026');
  });
});
