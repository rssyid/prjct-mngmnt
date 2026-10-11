import { describe, it, expect } from 'vitest';
import { isIntervalOverlapping } from '@/domain/approval/approval-matrix-service';

describe('Approval Matrix Tier Range Logic (AC-18)', () => {
  it('AC-18 mendeteksi tumpang tindih interval rentang [min, max) dengan benar', () => {
    // Interval A: [0, 500) dan Interval B: [500, 1000) -> TIDAK tumpang tindih karena batas atas eksklusif
    expect(isIntervalOverlapping(0, 500, 500, 1000)).toBe(false);
    expect(isIntervalOverlapping(500, 1000, 0, 500)).toBe(false);

    // Interval A: [0, 501) dan Interval B: [500, 1000) -> TUMPANG TINDIH
    expect(isIntervalOverlapping(0, 501, 500, 1000)).toBe(true);
    expect(isIntervalOverlapping(500, 1000, 0, 501)).toBe(true);

    // Interval A: [1000, null) dan Interval B: [500, 1500) -> TUMPANG TINDIH
    expect(isIntervalOverlapping(1000, null, 500, 1500)).toBe(true);

    // Interval A: [1000, null) dan Interval B: [0, 1000) -> TIDAK tumpang tindih
    expect(isIntervalOverlapping(1000, null, 0, 1000)).toBe(false);
  });

  it('AC-18 menguji aturan batas bawah inklusif dan batas atas eksklusif [min, max)', () => {
    const tier1 = { min: 0, max: 500_000_000 };
    const tier2 = { min: 500_000_000, max: 2_000_000_000 };
    const tier3 = { min: 2_000_000_000, max: null };

    const match = (val: number) => {
      if (val >= tier1.min && val < tier1.max) return 'Tier 1';
      if (val >= tier2.min && val < tier2.max) return 'Tier 2';
      if (val >= tier3.min && (tier3.max === null || val < tier3.max)) return 'Tier 3';
      return null;
    };

    expect(match(0)).toBe('Tier 1');
    expect(match(499_999_999)).toBe('Tier 1');
    // Batas 500 juta tepat harus masuk Tier 2, bukan Tier 1
    expect(match(500_000_000)).toBe('Tier 2');
    expect(match(1_999_999_999)).toBe('Tier 2');
    // Batas 2 miliar tepat harus masuk Tier 3, bukan Tier 2
    expect(match(2_000_000_000)).toBe('Tier 3');
    expect(match(10_000_000_000)).toBe('Tier 3');
  });
});
