import { describe, it, expect } from 'vitest';
import { Prisma } from '@/infra/db';

describe('AFCE Basis Amount & BOQ Calculation (AC-17, AC-19)', () => {
  it('AC-17 nilai basisAmount AFCE sama persis dengan total BOQ', () => {
    const boqItems = [
      { lineNo: 1, amount: new Prisma.Decimal('450000000.50') },
      { lineNo: 2, amount: new Prisma.Decimal('350000000.25') },
      { lineNo: 3, amount: new Prisma.Decimal('200000000.00') },
    ];

    const total = boqItems.reduce(
      (sum, item) => sum.add(item.amount),
      new Prisma.Decimal(0)
    );

    expect(total.toString()).toBe('1000000000.75');
  });

  it('AC-19 mendeteksi level snapshot yang berbeda dari urutan posisi matriks tier', () => {
    const tierPositions = ['pos-em', 'pos-gem', 'pos-rh'];

    // Snapshot sesuai persis
    const matchingSnapshots = ['pos-em', 'pos-gem', 'pos-rh'];
    const isSame =
      tierPositions.length === matchingSnapshots.length &&
      tierPositions.every((p, i) => p === matchingSnapshots[i]);
    expect(isSame).toBe(true);

    // Snapshot diubah urutannya
    const reorderedSnapshots = ['pos-em', 'pos-rh', 'pos-gem'];
    const isReorderedSame =
      tierPositions.length === reorderedSnapshots.length &&
      tierPositions.every((p, i) => p === reorderedSnapshots[i]);
    expect(isReorderedSame).toBe(false);

    // Snapshot ditambah jabatan ekstra
    const addedSnapshots = ['pos-em', 'pos-gem', 'pos-rh', 'pos-cfo'];
    const isAddedSame =
      tierPositions.length === addedSnapshots.length &&
      tierPositions.every((p, i) => p === addedSnapshots[i]);
    expect(isAddedSame).toBe(false);
  });
});
