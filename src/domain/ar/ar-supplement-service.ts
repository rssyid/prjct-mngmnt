import { prisma, Prisma } from '@/infra/db';
import { DomainError } from '@/shared/errors';
import { recordAuditLog } from '@/domain/audit/audit-service';
import { matchApprovalTier } from '@/domain/approval/approval-matrix-service';
import type {
  CreateArSupplementInput,
  PatchArSupplementInput,
  UpdateArLevelsInput,
  SubmitArInput,
} from '@/shared/schemas/ar-supplement';
import { getCurrentWibDate, toBusinessDateString } from '@/shared/lib/date';

export async function listProjectArSupplements(projectId: string) {
  const supplements = await prisma.arSupplement.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
    include: {
      matrixTier: {
        include: {
          levels: { orderBy: { levelNo: 'asc' } },
        },
      },
      levels: {
        orderBy: { levelNo: 'asc' },
        include: {
          position: true,
          record: true,
        },
      },
      budgetEntry: true,
    },
  });

  return supplements.map((ar) => {
    let isDifferentFromMatrix = false;
    if (ar.matrixTier && ar.levels) {
      const tierPos = ar.matrixTier.levels.map((l) => l.positionId);
      const snapPos = ar.levels.map((l) => l.positionId);
      if (
        tierPos.length !== snapPos.length ||
        !tierPos.every((id, idx) => id === snapPos[idx])
      ) {
        isDifferentFromMatrix = true;
      }
    }

    return {
      ...ar,
      isDifferentFromMatrix,
    };
  });
}

export async function createArSupplement(
  projectId: string,
  input: CreateArSupplementInput,
  actorId: string
) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.findUnique({
      where: { id: projectId },
      select: { id: true, status: true, deletedAt: true },
    });

    if (!project || project.deletedAt) {
      throw new DomainError('NOT_FOUND', 'Proyek tidak ditemukan');
    }

    // Gate AC-25: Ditolak di COMPLETED atau CANCELLED
    if (project.status === 'COMPLETED' || project.status === 'CANCELLED') {
      throw new DomainError(
        'PROJECT_LOCKED',
        'AR tambahan tidak dapat diajukan pada proyek yang telah selesai atau dibatalkan'
      );
    }

    const amountNum = Number(input.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new DomainError(
        'PRECONDITION_FAILED',
        'Nominal AR tambahan harus lebih besar dari 0'
      );
    }

    // Match tier for AR (AC-25 / D-08: tier dipilih dari nominal tambahan)
    const matchedTier = await matchApprovalTier('AR', amountNum);

    const ar = await tx.arSupplement.create({
      data: {
        projectId,
        number: input.number?.trim() ?? null,
        amount: new Prisma.Decimal(input.amount),
        reason: input.reason.trim(),
        date: new Date(input.date),
        status: 'DRAFT',
        matrixTierId: matchedTier.id,
        version: 1,
        levels: {
          create: matchedTier.levels.map((lvl) => ({
            levelNo: lvl.levelNo,
            positionId: lvl.positionId,
            positionNameSnapshot: lvl.position.name,
          })),
        },
      },
      include: {
        matrixTier: true,
        levels: {
          orderBy: { levelNo: 'asc' },
          include: { position: true },
        },
      },
    });

    await recordAuditLog(tx, {
      actorId,
      projectId,
      entityType: 'ArSupplement',
      entityId: ar.id,
      action: 'CREATE_AR_SUPPLEMENT',
      after: {
        amount: ar.amount.toString(),
        reason: ar.reason,
        status: ar.status,
      },
    });

    return ar;
  });
}

export async function patchArSupplement(
  arId: string,
  input: PatchArSupplementInput,
  actorId: string
) {
  return prisma.$transaction(async (tx) => {
    const ar = await tx.arSupplement.findUnique({
      where: { id: arId },
      include: { project: true },
    });

    if (!ar) {
      throw new DomainError('NOT_FOUND', 'Dokumen AR tambahan tidak ditemukan');
    }

    if (ar.project.status === 'COMPLETED' || ar.project.status === 'CANCELLED') {
      throw new DomainError(
        'PROJECT_LOCKED',
        'Proyek berada dalam status final dan terkunci'
      );
    }

    if (ar.status !== 'DRAFT') {
      throw new DomainError(
        'FIELD_INPUT_LOCKED',
        'AR tambahan hanya dapat diubah saat berstatus DRAFT'
      );
    }

    if (input.version !== undefined && ar.version !== input.version) {
      throw new DomainError(
        'VERSION_CONFLICT',
        'Data AR tambahan telah diperbarui oleh pengguna lain'
      );
    }

    let newTierId = ar.matrixTierId;
    let shouldSyncLevels = false;
    let newAmount = ar.amount;

    if (input.amount !== undefined) {
      const amountNum = Number(input.amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new DomainError(
          'PRECONDITION_FAILED',
          'Nominal AR tambahan harus lebih besar dari 0'
        );
      }
      newAmount = new Prisma.Decimal(input.amount);

      try {
        const matchedTier = await matchApprovalTier('AR', amountNum);
        if (matchedTier.id !== ar.matrixTierId) {
          newTierId = matchedTier.id;
          shouldSyncLevels = true;
        }
      } catch {
        newTierId = null;
      }
    }

    if (shouldSyncLevels && newTierId) {
      const tierLevels = await tx.approvalMatrixTierLevel.findMany({
        where: { tierId: newTierId },
        include: { position: true },
        orderBy: { levelNo: 'asc' },
      });

      await tx.approvalLevelSnapshot.deleteMany({
        where: { arSupplementId: arId },
      });

      await tx.approvalLevelSnapshot.createMany({
        data: tierLevels.map((lvl) => ({
          arSupplementId: arId,
          levelNo: lvl.levelNo,
          positionId: lvl.positionId,
          positionNameSnapshot: lvl.position.name,
        })),
      });
    }

    const updated = await tx.arSupplement.update({
      where: { id: arId, version: ar.version },
      data: {
        number: input.number !== undefined ? input.number?.trim() ?? null : ar.number,
        amount: newAmount,
        reason: input.reason !== undefined ? input.reason.trim() : ar.reason,
        date: input.date !== undefined ? new Date(input.date) : ar.date,
        matrixTierId: newTierId,
        version: { increment: 1 },
      },
      include: {
        matrixTier: true,
        levels: {
          orderBy: { levelNo: 'asc' },
          include: { position: true },
        },
      },
    });

    await recordAuditLog(tx, {
      actorId,
      projectId: ar.projectId,
      entityType: 'ArSupplement',
      entityId: arId,
      action: 'UPDATE_AR_SUPPLEMENT',
      before: { amount: ar.amount.toString(), reason: ar.reason },
      after: { amount: updated.amount.toString(), reason: updated.reason },
    });

    return updated;
  });
}

export async function updateArLevels(
  arId: string,
  input: UpdateArLevelsInput,
  actorId: string
) {
  return prisma.$transaction(async (tx) => {
    const ar = await tx.arSupplement.findUnique({
      where: { id: arId },
      include: { project: true, levels: true },
    });

    if (!ar) {
      throw new DomainError('NOT_FOUND', 'Dokumen AR tambahan tidak ditemukan');
    }

    if (ar.status !== 'DRAFT') {
      throw new DomainError(
        'FIELD_INPUT_LOCKED',
        'Level approval hanya dapat diubah saat AR tambahan berstatus DRAFT'
      );
    }

    if (input.version !== undefined && ar.version !== input.version) {
      throw new DomainError(
        'VERSION_CONFLICT',
        'Data AR tambahan telah diperbarui oleh pengguna lain'
      );
    }

    const positionIds = input.levels.map((l) => l.positionId);
    const positions = await tx.approvalPosition.findMany({
      where: { id: { in: positionIds } },
    });

    if (positions.length !== positionIds.length) {
      throw new DomainError(
        'NOT_FOUND',
        'Satu atau lebih jabatan approver tidak ditemukan'
      );
    }

    const posMap = new Map(positions.map((p) => [p.id, p.name]));

    await tx.approvalLevelSnapshot.deleteMany({
      where: { arSupplementId: arId },
    });

    await tx.approvalLevelSnapshot.createMany({
      data: input.levels.map((l) => ({
        arSupplementId: arId,
        levelNo: l.levelNo,
        positionId: l.positionId,
        positionNameSnapshot: posMap.get(l.positionId) || 'Approver',
      })),
    });

    const updated = await tx.arSupplement.update({
      where: { id: arId, version: ar.version },
      data: { version: { increment: 1 } },
      include: {
        matrixTier: true,
        levels: {
          orderBy: { levelNo: 'asc' },
          include: { position: true },
        },
      },
    });

    await recordAuditLog(tx, {
      actorId,
      projectId: ar.projectId,
      entityType: 'ArSupplement',
      entityId: arId,
      action: 'UPDATE_AR_LEVELS',
      before: { levels: ar.levels },
      after: { levels: updated.levels },
    });

    return updated;
  });
}

export async function submitArSupplement(
  arId: string,
  input: SubmitArInput,
  actorId: string
) {
  return prisma.$transaction(async (tx) => {
    const ar = await tx.arSupplement.findUnique({
      where: { id: arId },
      include: {
        project: true,
        levels: true,
      },
    });

    if (!ar) {
      throw new DomainError('NOT_FOUND', 'Dokumen AR tambahan tidak ditemukan');
    }

    if (ar.status !== 'DRAFT') {
      throw new DomainError(
        'ACTIVE_CONFLICT',
        `AR tambahan sudah dalam status ${ar.status} dan tidak dapat diajukan ulang`
      );
    }

    if (ar.project.status === 'COMPLETED' || ar.project.status === 'CANCELLED') {
      throw new DomainError(
        'PROJECT_LOCKED',
        'Proyek berada dalam status final dan terkunci'
      );
    }

    if (input.version !== undefined && ar.version !== input.version) {
      throw new DomainError(
        'VERSION_CONFLICT',
        'Data AR tambahan telah diperbarui oleh pengguna lain'
      );
    }

    if (ar.levels.length === 0) {
      throw new DomainError(
        'PRECONDITION_FAILED',
        'AR tambahan harus memiliki level approval sebelum diajukan'
      );
    }

    const todayWibStr = toBusinessDateString(getCurrentWibDate());
    if (input.submittedDate > todayWibStr) {
      throw new DomainError(
        'PRECONDITION_FAILED',
        'Tanggal pengajuan tidak boleh berada di masa depan'
      );
    }
    if (input.approvalEmailDate > todayWibStr) {
      throw new DomainError(
        'PRECONDITION_FAILED',
        'Tanggal email approval tidak boleh berada di masa depan'
      );
    }

    // Ensure matching tier exists
    const matchedTier = await matchApprovalTier('AR', ar.amount);

    const updated = await tx.arSupplement.update({
      where: { id: arId, version: ar.version },
      data: {
        status: 'DIAJUKAN',
        matrixTierId: matchedTier.id,
        submittedDate: new Date(input.submittedDate),
        approvalEmailDate: new Date(input.approvalEmailDate),
        version: { increment: 1 },
      },
      include: {
        matrixTier: true,
        levels: {
          orderBy: { levelNo: 'asc' },
          include: { position: true },
        },
      },
    });

    await recordAuditLog(tx, {
      actorId,
      projectId: ar.projectId,
      entityType: 'ArSupplement',
      entityId: arId,
      action: 'SUBMIT_AR_SUPPLEMENT',
      after: {
        status: updated.status,
        submittedDate: updated.submittedDate,
        approvalEmailDate: updated.approvalEmailDate,
        amount: updated.amount.toString(),
      },
    });

    return updated;
  });
}
