import { prisma, Prisma } from '@/infra/db';
import { DomainError } from '@/shared/errors';
import { recordAuditLog } from '@/domain/audit/audit-service';
import { transitionProjectStatus } from '@/domain/project-transition/transition-service';
import { matchApprovalTier } from '@/domain/approval/approval-matrix-service';
import type {
  CreateAfceAttemptInput,
  PatchAfceAttemptInput,
  ReplaceBoqInput,
  UpdateAfceLevelsInput,
  SubmitAfceInput,
} from '@/shared/schemas/afce';
import { getCurrentWibDate } from '@/shared/lib/date';

export async function listProjectAfceAttempts(projectId: string) {
  const attempts = await prisma.afceAttempt.findMany({
    where: { projectId },
    orderBy: { attemptNo: 'asc' },
    include: {
      matrixTier: {
        include: {
          levels: {
            orderBy: { levelNo: 'asc' },
          },
        },
      },
      levels: {
        orderBy: { levelNo: 'asc' },
        include: {
          position: true,
          record: true,
        },
      },
      boqItems: {
        orderBy: { lineNo: 'asc' },
      },
    },
  });

  return attempts.map((att) => {
    // Check if customized vs matching tier (AC-19)
    let isDifferentFromMatrix = false;
    if (att.matrixTier && att.levels) {
      const tierPos = att.matrixTier.levels.map((l) => l.positionId);
      const snapPos = att.levels.map((l) => l.positionId);
      if (
        tierPos.length !== snapPos.length ||
        !tierPos.every((id, idx) => id === snapPos[idx])
      ) {
        isDifferentFromMatrix = true;
      }
    }

    return {
      ...att,
      isDifferentFromMatrix,
    };
  });
}

export async function createAfceAttempt(
  projectId: string,
  input: CreateAfceAttemptInput,
  actorId: string
) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        status: true,
        deletedAt: true,
      },
    });

    if (!project || project.deletedAt) {
      throw new DomainError('NOT_FOUND', 'Proyek tidak ditemukan');
    }

    if (project.status === 'COMPLETED' || project.status === 'CANCELLED') {
      throw new DomainError(
        'PROJECT_LOCKED',
        'Proyek berada dalam status final dan terkunci'
      );
    }

    // AFCE can only be created in SURVEY or RAB_READY
    if (project.status !== 'SURVEY' && project.status !== 'RAB_READY') {
      throw new DomainError(
        'INVALID_TRANSITION',
        `AFCE hanya dapat dibuat saat proyek berstatus SURVEY atau RAB_READY (saat ini: ${project.status})`
      );
    }

    // Check if an active attempt exists (DRAFT or DIAJUKAN)
    const active = await tx.afceAttempt.findFirst({
      where: {
        projectId,
        status: { in: ['DRAFT', 'DIAJUKAN'] },
      },
    });
    if (active) {
      throw new DomainError(
        'ACTIVE_CONFLICT',
        'Sudah ada attempt AFCE yang sedang aktif (DRAFT/DIAJUKAN)'
      );
    }

    // Get previous attempt (if any)
    const lastAttempt = await tx.afceAttempt.findFirst({
      where: { projectId },
      orderBy: { attemptNo: 'desc' },
      include: {
        boqItems: { orderBy: { lineNo: 'asc' } },
      },
    });

    const nextAttemptNo = (lastAttempt?.attemptNo ?? 0) + 1;
    let initialBasis = new Prisma.Decimal(0);
    let copiedBoqs: Array<{
      lineNo: number;
      buildingName: string | null;
      activityName: string;
      amount: Prisma.Decimal;
      notes: string | null;
    }> = [];

    // AC-23: If previous attempt was DITOLAK, copy its BOQ items
    if (lastAttempt && lastAttempt.status === 'DITOLAK' && lastAttempt.boqItems.length > 0) {
      copiedBoqs = lastAttempt.boqItems.map((b) => ({
        lineNo: b.lineNo,
        buildingName: b.buildingName,
        activityName: b.activityName,
        amount: b.amount,
        notes: b.notes,
      }));
      initialBasis = copiedBoqs.reduce(
        (sum, item) => sum.add(item.amount),
        new Prisma.Decimal(0)
      );
    }

    // Match tier if we have basisAmount > 0
    let matchedTierId: string | null = null;
    let initialLevels: Array<{
      levelNo: number;
      positionId: string;
      positionNameSnapshot: string;
    }> = [];

    if (initialBasis.gt(0)) {
      try {
        const tier = await matchApprovalTier('AFCE', initialBasis);
        matchedTierId = tier.id;
        initialLevels = tier.levels.map((lvl) => ({
          levelNo: lvl.levelNo,
          positionId: lvl.positionId,
          positionNameSnapshot: lvl.position.name,
        }));
      } catch {
        // If no matching tier, tierId remains null
      }
    }

    const attempt = await tx.afceAttempt.create({
      data: {
        projectId,
        attemptNo: nextAttemptNo,
        status: 'DRAFT',
        rabReady: false,
        afceNumber: input.afceNumber?.trim() ?? null,
        documentDate: input.documentDate ? new Date(input.documentDate) : null,
        basisAmount: initialBasis,
        matrixTierId: matchedTierId,
        notes: input.notes?.trim() ?? null,
        version: 1,
        boqItems: {
          create: copiedBoqs.map((b) => ({
            lineNo: b.lineNo,
            buildingName: b.buildingName,
            activityName: b.activityName,
            amount: b.amount,
            notes: b.notes,
          })),
        },
        levels: {
          create: initialLevels.map((lvl) => ({
            levelNo: lvl.levelNo,
            positionId: lvl.positionId,
            positionNameSnapshot: lvl.positionNameSnapshot,
          })),
        },
      },
      include: {
        matrixTier: true,
        boqItems: true,
        levels: {
          include: { position: true },
        },
      },
    });

    await recordAuditLog(tx, {
      actorId,
      projectId,
      entityType: 'AfceAttempt',
      entityId: attempt.id,
      action: 'CREATE_AFCE_ATTEMPT',
      after: {
        attemptNo: attempt.attemptNo,
        status: attempt.status,
        basisAmount: attempt.basisAmount.toString(),
      },
    });

    return attempt;
  });
}

export async function patchAfceAttempt(
  attemptId: string,
  input: PatchAfceAttemptInput,
  actorId: string
) {
  return prisma.$transaction(async (tx) => {
    const attempt = await tx.afceAttempt.findUnique({
      where: { id: attemptId },
      include: { project: true },
    });

    if (!attempt) {
      throw new DomainError('NOT_FOUND', 'Attempt AFCE tidak ditemukan');
    }

    if (attempt.project.status === 'COMPLETED' || attempt.project.status === 'CANCELLED') {
      throw new DomainError(
        'PROJECT_LOCKED',
        'Proyek berada dalam status final dan terkunci'
      );
    }

    if (attempt.status !== 'DRAFT') {
      throw new DomainError(
        'FIELD_INPUT_LOCKED',
        'AFCE hanya dapat diubah saat berstatus DRAFT'
      );
    }

    if (input.version !== undefined && attempt.version !== input.version) {
      throw new DomainError(
        'VERSION_CONFLICT',
        'Data AFCE telah diperbarui oleh pengguna lain'
      );
    }

    // Gate AC-16: Marking rabReady = true while project is in SURVEY transitions project to RAB_READY
    if (input.rabReady === true && !attempt.rabReady) {
      if (attempt.project.status === 'SURVEY') {
        await transitionProjectStatus(
          {
            projectId: attempt.projectId,
            toStatus: 'RAB_READY',
            actorId,
            reason: 'RAB ditandai siap oleh pengguna',
          },
          tx
        );
      }
    }

    const updated = await tx.afceAttempt.update({
      where: { id: attempt.id, version: attempt.version },
      data: {
        afceNumber: input.afceNumber !== undefined ? input.afceNumber?.trim() ?? null : attempt.afceNumber,
        documentDate:
          input.documentDate !== undefined
            ? input.documentDate ? new Date(input.documentDate) : null
            : attempt.documentDate,
        rabReady: input.rabReady !== undefined ? input.rabReady : attempt.rabReady,
        notes: input.notes !== undefined ? input.notes?.trim() ?? null : attempt.notes,
        version: { increment: 1 },
      },
      include: {
        matrixTier: true,
        boqItems: true,
        levels: { include: { position: true } },
      },
    });

    await recordAuditLog(tx, {
      actorId,
      projectId: attempt.projectId,
      entityType: 'AfceAttempt',
      entityId: attempt.id,
      action: 'UPDATE_AFCE_ATTEMPT',
      before: {
        rabReady: attempt.rabReady,
        afceNumber: attempt.afceNumber,
      },
      after: {
        rabReady: updated.rabReady,
        afceNumber: updated.afceNumber,
      },
    });

    return updated;
  });
}

/**
 * Replaces all BOQ items for an AFCE attempt (AC-17).
 * Automatically recalculates basisAmount and syncs matching matrix tier & level snapshots.
 */
export async function replaceBoqItems(
  attemptId: string,
  input: ReplaceBoqInput,
  actorId: string
) {
  return prisma.$transaction(async (tx) => {
    const attempt = await tx.afceAttempt.findUnique({
      where: { id: attemptId },
      include: { project: true },
    });

    if (!attempt) {
      throw new DomainError('NOT_FOUND', 'Attempt AFCE tidak ditemukan');
    }

    if (attempt.status !== 'DRAFT') {
      throw new DomainError(
        'FIELD_INPUT_LOCKED',
        'Tabel BOQ terkunci dan tidak dapat diubah setelah AFCE diajukan'
      );
    }

    if (input.version !== undefined && attempt.version !== input.version) {
      throw new DomainError(
        'VERSION_CONFLICT',
        'Data AFCE telah diperbarui oleh pengguna lain'
      );
    }

    // Calculate total basisAmount (AC-17)
    let totalBasis = new Prisma.Decimal(0);
    for (const item of input.items) {
      const amt = new Prisma.Decimal(item.amount);
      if (amt.lt(0)) {
        throw new DomainError(
          'PRECONDITION_FAILED',
          'Nilai baris BOQ tidak boleh negatif'
        );
      }
      totalBasis = totalBasis.add(amt);
    }

    // Delete existing BOQ items
    await tx.boqItem.deleteMany({
      where: { afceAttemptId: attemptId },
    });

    // Insert new BOQ items
    await tx.boqItem.createMany({
      data: input.items.map((b) => ({
        afceAttemptId: attemptId,
        lineNo: b.lineNo,
        buildingName: b.buildingName?.trim() ?? null,
        activityName: b.activityName.trim(),
        amount: new Prisma.Decimal(b.amount),
        notes: b.notes?.trim() ?? null,
      })),
    });

    // Try to match tier with the new basisAmount (AC-18)
    let newTierId = attempt.matrixTierId;
    let shouldSyncLevels = false;

    try {
      const matchedTier = await matchApprovalTier('AFCE', totalBasis);
      if (matchedTier.id !== attempt.matrixTierId) {
        newTierId = matchedTier.id;
        shouldSyncLevels = true;
      }
    } catch {
      newTierId = null;
    }

    if (shouldSyncLevels && newTierId) {
      // Sync levels from newly matched tier
      const tierLevels = await tx.approvalMatrixTierLevel.findMany({
        where: { tierId: newTierId },
        include: { position: true },
        orderBy: { levelNo: 'asc' },
      });

      await tx.approvalLevelSnapshot.deleteMany({
        where: { afceAttemptId: attemptId },
      });

      await tx.approvalLevelSnapshot.createMany({
        data: tierLevels.map((lvl) => ({
          afceAttemptId: attemptId,
          levelNo: lvl.levelNo,
          positionId: lvl.positionId,
          positionNameSnapshot: lvl.position.name,
        })),
      });
    }

    const updated = await tx.afceAttempt.update({
      where: { id: attemptId, version: attempt.version },
      data: {
        basisAmount: totalBasis,
        matrixTierId: newTierId,
        version: { increment: 1 },
      },
      include: {
        matrixTier: true,
        boqItems: { orderBy: { lineNo: 'asc' } },
        levels: {
          orderBy: { levelNo: 'asc' },
          include: { position: true },
        },
      },
    });

    await recordAuditLog(tx, {
      actorId,
      projectId: attempt.projectId,
      entityType: 'AfceAttempt',
      entityId: attemptId,
      action: 'REPLACE_BOQ',
      before: {
        basisAmount: attempt.basisAmount.toString(),
      },
      after: {
        basisAmount: updated.basisAmount.toString(),
        boqCount: input.items.length,
      },
    });

    return updated;
  });
}

/**
 * Customizes approval level snapshots during DRAFT (AC-19).
 */
export async function updateAfceLevels(
  attemptId: string,
  input: UpdateAfceLevelsInput,
  actorId: string
) {
  return prisma.$transaction(async (tx) => {
    const attempt = await tx.afceAttempt.findUnique({
      where: { id: attemptId },
      include: { project: true, levels: true },
    });

    if (!attempt) {
      throw new DomainError('NOT_FOUND', 'Attempt AFCE tidak ditemukan');
    }

    if (attempt.status !== 'DRAFT') {
      throw new DomainError(
        'FIELD_INPUT_LOCKED',
        'Level approval hanya dapat diubah saat AFCE berstatus DRAFT'
      );
    }

    if (input.version !== undefined && attempt.version !== input.version) {
      throw new DomainError(
        'VERSION_CONFLICT',
        'Data AFCE telah diperbarui oleh pengguna lain'
      );
    }

    // Fetch positions to populate snapshots
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

    // Delete old snapshots
    await tx.approvalLevelSnapshot.deleteMany({
      where: { afceAttemptId: attemptId },
    });

    // Create new snapshots
    await tx.approvalLevelSnapshot.createMany({
      data: input.levels.map((l) => ({
        afceAttemptId: attemptId,
        levelNo: l.levelNo,
        positionId: l.positionId,
        positionNameSnapshot: posMap.get(l.positionId) || 'Approver',
      })),
    });

    const updated = await tx.afceAttempt.update({
      where: { id: attemptId, version: attempt.version },
      data: { version: { increment: 1 } },
      include: {
        matrixTier: true,
        boqItems: true,
        levels: {
          orderBy: { levelNo: 'asc' },
          include: { position: true },
        },
      },
    });

    await recordAuditLog(tx, {
      actorId,
      projectId: attempt.projectId,
      entityType: 'AfceAttempt',
      entityId: attemptId,
      action: 'UPDATE_AFCE_LEVELS',
      before: { levels: attempt.levels },
      after: { levels: updated.levels },
    });

    return updated;
  });
}

/**
 * Submits an AFCE attempt (AC-20).
 * Validates dates, checks matching tier, locks AFCE, and transitions project to WAITING_AFCE_AR.
 */
export async function submitAfceAttempt(
  attemptId: string,
  input: SubmitAfceInput,
  actorId: string
) {
  return prisma.$transaction(async (tx) => {
    const attempt = await tx.afceAttempt.findUnique({
      where: { id: attemptId },
      include: {
        project: true,
        boqItems: true,
        levels: true,
      },
    });

    if (!attempt) {
      throw new DomainError('NOT_FOUND', 'Attempt AFCE tidak ditemukan');
    }

    if (attempt.status !== 'DRAFT') {
      throw new DomainError(
        'ACTIVE_CONFLICT',
        `AFCE sudah dalam status ${attempt.status} dan tidak dapat diajukan ulang`
      );
    }

    if (input.version !== undefined && attempt.version !== input.version) {
      throw new DomainError(
        'VERSION_CONFLICT',
        'Data AFCE telah diperbarui oleh pengguna lain'
      );
    }

    // Gate 1: Project status must be RAB_READY
    if (attempt.project.status !== 'RAB_READY') {
      throw new DomainError(
        'INVALID_TRANSITION',
        `Pengajuan AFCE hanya dapat dilakukan saat proyek berstatus RAB_READY (saat ini: ${attempt.project.status})`
      );
    }

    // Gate 2: BOQ items >= 1
    if (attempt.boqItems.length === 0) {
      throw new DomainError(
        'PRECONDITION_FAILED',
        'AFCE harus memiliki minimal 1 baris BOQ sebelum diajukan'
      );
    }

    // Gate 3: Levels >= 1
    if (attempt.levels.length === 0) {
      throw new DomainError(
        'PRECONDITION_FAILED',
        'AFCE harus memiliki level approval sebelum diajukan'
      );
    }

    // Gate 4: Dates must not be in future (WIB)
    const todayWib = getCurrentWibDate().toISOString().split('T')[0] ?? '';
    if (input.submittedDate > todayWib) {
      throw new DomainError(
        'PRECONDITION_FAILED',
        'Tanggal pengajuan tidak boleh berada di masa depan'
      );
    }
    if (input.approvalEmailDate > todayWib) {
      throw new DomainError(
        'PRECONDITION_FAILED',
        'Tanggal email approval tidak boleh berada di masa depan'
      );
    }

    // Gate 5: Matching tier must exist for basisAmount (AC-18)
    const matchedTier = await matchApprovalTier('AFCE', attempt.basisAmount);

    // Update AFCE to DIAJUKAN
    const updated = await tx.afceAttempt.update({
      where: { id: attemptId, version: attempt.version },
      data: {
        status: 'DIAJUKAN',
        matrixTierId: matchedTier.id,
        submittedDate: new Date(input.submittedDate),
        approvalEmailDate: new Date(input.approvalEmailDate),
        version: { increment: 1 },
      },
      include: {
        matrixTier: true,
        boqItems: true,
        levels: {
          orderBy: { levelNo: 'asc' },
          include: { position: true },
        },
      },
    });

    // Transition project to WAITING_AFCE_AR (AC-20)
    const transitionResult = await transitionProjectStatus(
      {
        projectId: attempt.projectId,
        toStatus: 'WAITING_AFCE_AR',
        actorId,
        reason: 'Pengajuan AFCE ke approval SAP',
      },
      tx
    );

    await recordAuditLog(tx, {
      actorId,
      projectId: attempt.projectId,
      entityType: 'AfceAttempt',
      entityId: attemptId,
      action: 'SUBMIT_AFCE',
      after: {
        status: updated.status,
        submittedDate: updated.submittedDate,
        approvalEmailDate: updated.approvalEmailDate,
        basisAmount: updated.basisAmount.toString(),
      },
    });

    return {
      attempt: updated,
      project: transitionResult.project,
      projectStatus: transitionResult.project.status,
    };
  });
}
