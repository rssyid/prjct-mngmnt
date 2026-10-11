import { prisma } from '@/infra/db';

/**
 * Ensures standard non-overlapping approval tiers exist for tests:
 * - Tier 1: [0, 500_000_000) with 2 levels (p1, p2)
 * - Tier 2: [500_000_000, 2_000_000_000) with 3 levels (p1, p2, p3)
 * - Tier 3: [2_000_000_000, null) with 3 levels (p1, p2, p3)
 */
export async function ensureStandardTestTiers() {
  const positions = await prisma.approvalPosition.findMany({
    orderBy: { rank: 'asc' },
    take: 3,
  });

  if (positions.length < 3) {
    throw new Error('Approval positions must be seeded before running tests');
  }

  const [p1, p2, p3] = positions;

  // 1. Tier 1: [0, 500_000_000)
  const tier1 = await prisma.approvalMatrixTier.findFirst({
    where: {
      isActive: true,
      forAfce: true,
      forArSupplement: true,
      minAmount: 0,
      maxAmount: 500000000,
    },
    include: { levels: true },
  });

  if (!tier1) {
    await prisma.approvalMatrixTier.create({
      data: {
        name: 'Standard Test Tier 1 (<500M)',
        forAfce: true,
        forArSupplement: true,
        minAmount: 0,
        maxAmount: 500000000,
        isActive: true,
        levels: {
          create: [
            { levelNo: 1, positionId: p1!.id },
            { levelNo: 2, positionId: p2!.id },
          ],
        },
      },
    });
  }

  // 2. Tier 2: [500_000_000, 2_000_000_000)
  const tier2 = await prisma.approvalMatrixTier.findFirst({
    where: {
      isActive: true,
      forAfce: true,
      forArSupplement: true,
      minAmount: 500000000,
      maxAmount: 2000000000,
    },
    include: { levels: true },
  });

  if (!tier2) {
    await prisma.approvalMatrixTier.create({
      data: {
        name: 'Standard Test Tier 2 (500M-2B)',
        forAfce: true,
        forArSupplement: true,
        minAmount: 500000000,
        maxAmount: 2000000000,
        isActive: true,
        levels: {
          create: [
            { levelNo: 1, positionId: p1!.id },
            { levelNo: 2, positionId: p2!.id },
            { levelNo: 3, positionId: p3!.id },
          ],
        },
      },
    });
  }

  // 3. Tier 3: [2_000_000_000, null)
  const tier3 = await prisma.approvalMatrixTier.findFirst({
    where: {
      isActive: true,
      forAfce: true,
      forArSupplement: true,
      minAmount: 2000000000,
      maxAmount: null,
    },
    include: { levels: true },
  });

  if (!tier3) {
    await prisma.approvalMatrixTier.create({
      data: {
        name: 'Standard Test Tier 3 (>2B)',
        forAfce: true,
        forArSupplement: true,
        minAmount: 2000000000,
        maxAmount: null,
        isActive: true,
        levels: {
          create: [
            { levelNo: 1, positionId: p1!.id },
            { levelNo: 2, positionId: p2!.id },
            { levelNo: 3, positionId: p3!.id },
          ],
        },
      },
    });
  }
}
