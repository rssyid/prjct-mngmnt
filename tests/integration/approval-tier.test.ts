import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma, Prisma } from '@/infra/db';
import {
  createApprovalTier,
  updateApprovalTier,
  listApprovalTiers,
  matchApprovalTier,
} from '@/domain/approval/approval-matrix-service';
import { DomainError } from '@/shared/errors';
import { ensureStandardTestTiers } from '../helpers/test-tiers';

describe('Approval Matrix Tier Management & Matching (AC-18)', () => {
  const timestamp = Date.now();
  const testUserId = `user_tier_${timestamp}`;
  let pos1Id = '';
  let pos2Id = '';
  let pos3Id = '';

  beforeAll(async () => {
    // 1. User
    await prisma.user.create({
      data: {
        id: testUserId,
        name: 'Tier Test User',
        email: `tier_${timestamp}@example.com`,
        role: 'SUPER_ADMIN',
      },
    });

    // 2. Positions (EM, GEM, RH)
    const positions = await prisma.approvalPosition.findMany({
      orderBy: { rank: 'asc' },
      take: 3,
    });
    if (positions.length >= 3 && positions[0] && positions[1] && positions[2]) {
      pos1Id = positions[0].id;
      pos2Id = positions[1].id;
      pos3Id = positions[2].id;
    } else {
      const p1 = await prisma.approvalPosition.create({
        data: { code: `P1_${timestamp}`, name: 'Pos 1', rank: 100 },
      });
      const p2 = await prisma.approvalPosition.create({
        data: { code: `P2_${timestamp}`, name: 'Pos 2', rank: 101 },
      });
      const p3 = await prisma.approvalPosition.create({
        data: { code: `P3_${timestamp}`, name: 'Pos 3', rank: 102 },
      });
      pos1Id = p1.id;
      pos2Id = p2.id;
      pos3Id = p3.id;
    }

    // Bersihkan semua tiers agar fresh untuk pengujian pembuatan tier
    await prisma.arSupplement.updateMany({ data: { matrixTierId: null } });
    await prisma.afceAttempt.updateMany({ data: { matrixTierId: null } });
    await prisma.approvalMatrixTierLevel.deleteMany();
    await prisma.approvalMatrixTier.deleteMany();
  });

  afterAll(async () => {
    await prisma.arSupplement.updateMany({ data: { matrixTierId: null } });
    await prisma.afceAttempt.updateMany({ data: { matrixTierId: null } });
    await prisma.approvalMatrixTierLevel.deleteMany();
    await prisma.approvalMatrixTier.deleteMany();

    await prisma.user.update({
      where: { id: testUserId },
      data: { isActive: false },
    }).catch(() => {});

    // Ensure standard tiers are available for all other test files
    await ensureStandardTestTiers();
  });

  it('AC-18 berhasil membuat tier matriks approval dan menolak rentang yang tumpang tindih', async () => {
    // 1. Buat Tier 1: [0, 500_000_000)
    const tier1 = await createApprovalTier(
      {
        name: `Tier 1 Uji ${timestamp}`,
        forAfce: true,
        forArSupplement: true,
        minAmount: 0,
        maxAmount: 500000000,
        isActive: true,
        levels: [
          { levelNo: 1, positionId: pos1Id },
          { levelNo: 2, positionId: pos2Id },
        ],
      },
      testUserId
    );
    expect(tier1.id).toBeDefined();
    expect(tier1.levels.length).toBe(2);

    // 2. Coba buat tier yang tumpang tindih: [400_000_000, 1_000_000_000) -> harus ditolak
    await expect(
      createApprovalTier(
        {
          name: `Tier Overlap ${timestamp}`,
          forAfce: true,
          forArSupplement: false,
          minAmount: 400000000,
          maxAmount: 1000000000,
          isActive: true,
          levels: [{ levelNo: 1, positionId: pos1Id }],
        },
        testUserId
      )
    ).rejects.toThrowError(/tumpang tindih/);

    // 3. Buat Tier 2 yang sah: [500_000_000, 2_000_000_000)
    const tier2 = await createApprovalTier(
      {
        name: `Tier 2 Uji ${timestamp}`,
        forAfce: true,
        forArSupplement: true,
        minAmount: 500000000,
        maxAmount: 2000000000,
        isActive: true,
        levels: [
          { levelNo: 1, positionId: pos1Id },
          { levelNo: 2, positionId: pos2Id },
          { levelNo: 3, positionId: pos3Id },
        ],
      },
      testUserId
    );
    expect(tier2.id).toBeDefined();

    // 4. Buat Tier 3 tanpa batas atas: [2_000_000_000, null)
    const tier3 = await createApprovalTier(
      {
        name: `Tier 3 Uji ${timestamp}`,
        forAfce: true,
        forArSupplement: true,
        minAmount: 2000000000,
        maxAmount: null,
        isActive: true,
        levels: [
          { levelNo: 1, positionId: pos1Id },
          { levelNo: 2, positionId: pos2Id },
          { levelNo: 3, positionId: pos3Id },
        ],
      },
      testUserId
    );
    expect(tier3.id).toBeDefined();
  });

  it('AC-18 mencocokkan tier dengan aturan bawah inklusif, atas eksklusif [min, max)', async () => {
    // Nominal 300 juta -> Tier 1
    const match1 = await matchApprovalTier('AFCE', 300000000);
    expect(match1.minAmount.toNumber()).toBe(0);

    // Tepat 500 juta -> Tier 2 (bukan Tier 1)
    const match2 = await matchApprovalTier('AFCE', 500000000);
    expect(match2.minAmount.toNumber()).toBe(500000000);

    // Nominal 1,5 miliar -> Tier 2
    const match2b = await matchApprovalTier('AFCE', 1500000000);
    expect(match2b.minAmount.toNumber()).toBe(500000000);

    // Tepat 2 miliar -> Tier 3
    const match3 = await matchApprovalTier('AFCE', 2000000000);
    expect(match3.minAmount.toNumber()).toBe(2000000000);
    expect(match3.maxAmount).toBeNull();
  });

  it('AC-18 melempar 409 PRECONDITION_FAILED jika tidak ada tier aktif yang cocok', async () => {
    // Nonaktifkan semua tier sementara atau cari nominal negatif
    await expect(matchApprovalTier('AFCE', -100)).rejects.toThrowError(
      /Tidak ada tier matriks approval yang cocok/
    );
  });
});
