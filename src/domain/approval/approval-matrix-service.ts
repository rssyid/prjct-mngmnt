import { prisma, Prisma } from '@/infra/db';
import { DomainError } from '@/shared/errors';
import { recordAuditLog } from '@/domain/audit/audit-service';
import type {
  CreateApprovalTierInput,
  UpdateApprovalTierInput,
} from '@/shared/schemas/approval-tier';

export function isIntervalOverlapping(
  minA: number,
  maxA: number | null,
  minB: number,
  maxB: number | null
): boolean {
  // [minA, maxA) and [minB, maxB)
  const aEnd = maxA === null ? Infinity : maxA;
  const bEnd = maxB === null ? Infinity : maxB;

  return minA < bEnd && minB < aEnd;
}

export async function validateNonOverlappingTiers(
  tx: Prisma.TransactionClient,
  tier: {
    forAfce: boolean;
    forArSupplement: boolean;
    minAmount: number;
    maxAmount: number | null;
    isActive: boolean;
  },
  excludeTierId?: string
) {
  if (!tier.isActive) return;

  const existingTiers = await tx.approvalMatrixTier.findMany({
    where: {
      isActive: true,
      ...(excludeTierId ? { id: { not: excludeTierId } } : {}),
    },
    select: {
      id: true,
      name: true,
      forAfce: true,
      forArSupplement: true,
      minAmount: true,
      maxAmount: true,
    },
  });

  for (const ex of existingTiers) {
    const exMin = ex.minAmount.toNumber();
    const exMax = ex.maxAmount ? ex.maxAmount.toNumber() : null;

    if (tier.forAfce && ex.forAfce) {
      if (isIntervalOverlapping(tier.minAmount, tier.maxAmount, exMin, exMax)) {
        throw new DomainError(
          'PRECONDITION_FAILED',
          `Rentang nominal tier tumpang tindih dengan tier "${ex.name}" pada dokumen AFCE`
        );
      }
    }

    if (tier.forArSupplement && ex.forArSupplement) {
      if (isIntervalOverlapping(tier.minAmount, tier.maxAmount, exMin, exMax)) {
        throw new DomainError(
          'PRECONDITION_FAILED',
          `Rentang nominal tier tumpang tindih dengan tier "${ex.name}" pada dokumen AR Tambahan`
        );
      }
    }
  }
}

export async function listApprovalTiers() {
  return prisma.approvalMatrixTier.findMany({
    orderBy: { minAmount: 'asc' },
    include: {
      levels: {
        orderBy: { levelNo: 'asc' },
        include: {
          position: true,
        },
      },
    },
  });
}

export async function createApprovalTier(
  input: CreateApprovalTierInput,
  actorId: string
) {
  return prisma.$transaction(async (tx) => {
    const minAmountNum = Number(input.minAmount);
    const maxAmountNum =
      input.maxAmount !== null && input.maxAmount !== undefined
        ? Number(input.maxAmount)
        : null;

    // Validate non-overlapping ranges (AC-18)
    await validateNonOverlappingTiers(tx, {
      forAfce: input.forAfce,
      forArSupplement: input.forArSupplement,
      minAmount: minAmountNum,
      maxAmount: maxAmountNum,
      isActive: input.isActive,
    });

    const tier = await tx.approvalMatrixTier.create({
      data: {
        name: input.name.trim(),
        forAfce: input.forAfce,
        forArSupplement: input.forArSupplement,
        minAmount: new Prisma.Decimal(input.minAmount),
        maxAmount:
          input.maxAmount !== null && input.maxAmount !== undefined
            ? new Prisma.Decimal(input.maxAmount)
            : null,
        isActive: input.isActive,
        levels: {
          create: input.levels.map((lvl) => ({
            levelNo: lvl.levelNo,
            positionId: lvl.positionId,
          })),
        },
      },
      include: {
        levels: {
          orderBy: { levelNo: 'asc' },
          include: { position: true },
        },
      },
    });

    await recordAuditLog(tx, {
      actorId,
      entityType: 'ApprovalMatrixTier',
      entityId: tier.id,
      action: 'CREATE_TIER',
      after: {
        name: tier.name,
        minAmount: tier.minAmount.toString(),
        maxAmount: tier.maxAmount?.toString() ?? null,
        levelCount: tier.levels.length,
      },
    });

    return tier;
  });
}

export async function updateApprovalTier(
  id: string,
  input: UpdateApprovalTierInput,
  actorId: string
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.approvalMatrixTier.findUnique({
      where: { id },
      include: { levels: true },
    });

    if (!existing) {
      throw new DomainError('NOT_FOUND', 'Tier matriks approval tidak ditemukan');
    }

    if (input.version !== undefined && existing.version !== input.version) {
      throw new DomainError(
        'VERSION_CONFLICT',
        'Data tier telah diperbarui oleh pengguna lain'
      );
    }

    const minAmountNum =
      input.minAmount !== undefined
        ? Number(input.minAmount)
        : existing.minAmount.toNumber();
    const maxAmountNum =
      input.maxAmount !== undefined
        ? input.maxAmount !== null
          ? Number(input.maxAmount)
          : null
        : existing.maxAmount
          ? existing.maxAmount.toNumber()
          : null;

    const forAfce = input.forAfce !== undefined ? input.forAfce : existing.forAfce;
    const forArSupplement =
      input.forArSupplement !== undefined
        ? input.forArSupplement
        : existing.forArSupplement;
    const isActive =
      input.isActive !== undefined ? input.isActive : existing.isActive;

    await validateNonOverlappingTiers(
      tx,
      {
        forAfce,
        forArSupplement,
        minAmount: minAmountNum,
        maxAmount: maxAmountNum,
        isActive,
      },
      id
    );

    // Update levels if provided
    if (input.levels) {
      await tx.approvalMatrixTierLevel.deleteMany({
        where: { tierId: id },
      });
      await tx.approvalMatrixTierLevel.createMany({
        data: input.levels.map((lvl) => ({
          tierId: id,
          levelNo: lvl.levelNo,
          positionId: lvl.positionId,
        })),
      });
    }

    const updated = await tx.approvalMatrixTier.update({
      where: { id, version: existing.version },
      data: {
        name: input.name !== undefined ? input.name.trim() : existing.name,
        forAfce,
        forArSupplement,
        minAmount: new Prisma.Decimal(minAmountNum),
        maxAmount: maxAmountNum !== null ? new Prisma.Decimal(maxAmountNum) : null,
        isActive,
        version: { increment: 1 },
      },
      include: {
        levels: {
          orderBy: { levelNo: 'asc' },
          include: { position: true },
        },
      },
    });

    await recordAuditLog(tx, {
      actorId,
      entityType: 'ApprovalMatrixTier',
      entityId: id,
      action: 'UPDATE_TIER',
      before: {
        name: existing.name,
        minAmount: existing.minAmount.toString(),
        maxAmount: existing.maxAmount?.toString() ?? null,
      },
      after: {
        name: updated.name,
        minAmount: updated.minAmount.toString(),
        maxAmount: updated.maxAmount?.toString() ?? null,
      },
    });

    return updated;
  });
}

/**
 * Matches an active approval tier by document type and amount (AC-18).
 * Lower bound inclusive, upper bound exclusive: [minAmount, maxAmount).
 */
export async function matchApprovalTier(
  docType: 'AFCE' | 'AR',
  amount: Prisma.Decimal | number | string
) {
  const numericAmount = typeof amount === 'number' ? amount : Number(amount);

  const whereClause: Prisma.ApprovalMatrixTierWhereInput = {
    isActive: true,
    ...(docType === 'AFCE' ? { forAfce: true } : { forArSupplement: true }),
  };

  const candidateTiers = await prisma.approvalMatrixTier.findMany({
    where: whereClause,
    orderBy: { minAmount: 'asc' },
    include: {
      levels: {
        orderBy: { levelNo: 'asc' },
        include: { position: true },
      },
    },
  });

  const matched = candidateTiers.find((tier) => {
    const min = tier.minAmount.toNumber();
    const max = tier.maxAmount ? tier.maxAmount.toNumber() : Infinity;
    // Bawah inklusif, atas eksklusif
    return numericAmount >= min && numericAmount < max;
  });

  if (!matched) {
    throw new DomainError(
      'PRECONDITION_FAILED',
      `Tidak ada tier matriks approval yang cocok untuk nominal dokumen ${docType} sebesar ${numericAmount.toLocaleString('id-ID')}`
    );
  }

  return matched;
}
