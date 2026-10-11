import { prisma, Prisma } from '@/infra/db';
import { DomainError } from '@/shared/errors';
import { recordAuditLog } from '@/domain/audit/audit-service';
import type { ProjectStatus } from '@/generated/prisma/enums';

export interface TransitionProjectInput {
  projectId: string;
  toStatus: ProjectStatus;
  actorId?: string | null;
  reason?: string | null;
  expectedCurrentStatus?: ProjectStatus | ProjectStatus[];
}

// Valid non-terminal statuses that can be put ON_HOLD
export const HOLDABLE_STATUSES: ProjectStatus[] = [
  'SURVEY',
  'RAB_READY',
  'WAITING_AFCE_AR',
  'AFCE_AR_APPROVED',
  'PROCUREMENT',
  'EXECUTION',
  'WAITING_BAST',
];

// Non-terminal statuses that can be cancelled
export const CANCELLABLE_STATUSES: ProjectStatus[] = [
  'DRAFT',
  'SURVEY',
  'RAB_READY',
  'WAITING_AFCE_AR',
  'AFCE_AR_APPROVED',
  'PROCUREMENT',
  'EXECUTION',
  'WAITING_BAST',
  'ON_HOLD',
];

export function validateAllowedTransition(
  fromStatus: ProjectStatus,
  toStatus: ProjectStatus,
  project: {
    previousStatus?: ProjectStatus | null;
    categoryId?: string | null;
    picUserId?: string | null;
    targetStartDate?: Date | null;
    targetEndDate?: Date | null;
    plannedBudget?: Prisma.Decimal | null;
    estates?: { isPrimary: boolean }[];
  },
  reason?: string | null
): void {
  // Same status is a no-op / invalid
  if (fromStatus === toStatus) {
    throw new DomainError(
      'INVALID_TRANSITION',
      `Status proyek saat ini sudah ${fromStatus}`
    );
  }

  // 1. Transition to ON_HOLD
  if (toStatus === 'ON_HOLD') {
    if (!HOLDABLE_STATUSES.includes(fromStatus)) {
      throw new DomainError(
        'INVALID_TRANSITION',
        `Proyek dalam status ${fromStatus} tidak dapat ditahan (hanya SURVEY s.d. WAITING_BAST)`
      );
    }
    if (!reason || reason.trim().length === 0) {
      throw new DomainError(
        'PRECONDITION_FAILED',
        'Alasan penahanan proyek wajib diisi'
      );
    }
    return;
  }

  // 2. Transition from ON_HOLD (Resume)
  if (fromStatus === 'ON_HOLD') {
    if (toStatus === 'CANCELLED') {
      if (!reason || reason.trim().length === 0) {
        throw new DomainError(
          'PRECONDITION_FAILED',
          'Alasan pembatalan proyek wajib diisi'
        );
      }
      return;
    }

    if (!project.previousStatus) {
      throw new DomainError(
        'INVALID_TRANSITION',
        'Data status proyek sebelumnya tidak ditemukan'
      );
    }

    if (toStatus !== project.previousStatus) {
      throw new DomainError(
        'INVALID_TRANSITION',
        `Proyek hanya dapat dilanjutkan kembali ke status sebelumnya (${project.previousStatus})`
      );
    }
    return;
  }

  // 3. Transition to CANCELLED
  if (toStatus === 'CANCELLED') {
    if (!CANCELLABLE_STATUSES.includes(fromStatus)) {
      throw new DomainError(
        'INVALID_TRANSITION',
        `Proyek dalam status ${fromStatus} tidak dapat dibatalkan`
      );
    }
    if (!reason || reason.trim().length === 0) {
      throw new DomainError(
        'PRECONDITION_FAILED',
        'Alasan pembatalan proyek wajib diisi'
      );
    }
    return;
  }

  // 4. Standard State Machine transitions (docs/01-domain.md §5)
  switch (fromStatus) {
    case 'DRAFT':
      if (toStatus !== 'SURVEY') {
        throw new DomainError(
          'INVALID_TRANSITION',
          `Transisi status tidak sah dari ${fromStatus} ke ${toStatus}`
        );
      }
      // Gate AC-12: Kategori, PIC, target tanggal, anggaran rencana, dan lokasi wajib lengkap
      if (
        !project.categoryId ||
        !project.picUserId ||
        !project.targetStartDate ||
        !project.targetEndDate ||
        project.plannedBudget === null ||
        project.plannedBudget === undefined
      ) {
        throw new DomainError(
          'PRECONDITION_FAILED',
          'Data dasar proyek (kategori, PIC, target mulai/selesai, anggaran rencana) wajib lengkap sebelum Mulai Survei'
        );
      }
      if (project.estates && project.estates.length === 0) {
        throw new DomainError(
          'PRECONDITION_FAILED',
          'Proyek harus memiliki minimal satu Estate sebelum Mulai Survei'
        );
      }
      if (project.estates && !project.estates.some((e) => e.isPrimary)) {
        throw new DomainError(
          'PRECONDITION_FAILED',
          'Proyek harus memiliki tepat satu Estate utama sebelum Mulai Survei'
        );
      }
      break;

    case 'SURVEY':
      if (toStatus !== 'RAB_READY') {
        throw new DomainError(
          'INVALID_TRANSITION',
          `Transisi status tidak sah dari ${fromStatus} ke ${toStatus}`
        );
      }
      break;

    case 'RAB_READY':
      if (toStatus !== 'WAITING_AFCE_AR') {
        throw new DomainError(
          'INVALID_TRANSITION',
          `Transisi status tidak sah dari ${fromStatus} ke ${toStatus}`
        );
      }
      break;

    case 'WAITING_AFCE_AR':
      if (toStatus !== 'AFCE_AR_APPROVED' && toStatus !== 'RAB_READY') {
        throw new DomainError(
          'INVALID_TRANSITION',
          `Transisi status tidak sah dari ${fromStatus} ke ${toStatus}`
        );
      }
      break;

    case 'AFCE_AR_APPROVED':
      if (toStatus !== 'PROCUREMENT') {
        throw new DomainError(
          'INVALID_TRANSITION',
          `Transisi status tidak sah dari ${fromStatus} ke ${toStatus}`
        );
      }
      break;

    case 'PROCUREMENT':
      if (toStatus !== 'EXECUTION') {
        throw new DomainError(
          'INVALID_TRANSITION',
          `Transisi status tidak sah dari ${fromStatus} ke ${toStatus}`
        );
      }
      break;

    case 'EXECUTION':
      if (toStatus !== 'WAITING_BAST') {
        throw new DomainError(
          'INVALID_TRANSITION',
          `Transisi status tidak sah dari ${fromStatus} ke ${toStatus}`
        );
      }
      break;

    case 'WAITING_BAST':
      if (toStatus !== 'EXECUTION' && toStatus !== 'COMPLETED') {
        throw new DomainError(
          'INVALID_TRANSITION',
          `Transisi status tidak sah dari ${fromStatus} ke ${toStatus}`
        );
      }
      break;

    case 'COMPLETED':
    case 'CANCELLED':
      throw new DomainError(
        'PROJECT_LOCKED',
        'Proyek berada dalam status final dan terkunci untuk seluruh perubahan'
      );

    default:
      throw new DomainError(
        'INVALID_TRANSITION',
        `Transisi status tidak sah dari ${fromStatus} ke ${toStatus}`
      );
  }
}

/**
 * Single source of truth for updating Project.status.
 * Rule 10: Hanya modul src/domain/project-transition yang mengubah Project.status,
 * dan setiap perubahan menulis ProjectStatusHistory di transaksi yang sama.
 */
export async function transitionProjectStatus(
  input: TransitionProjectInput,
  externalTx?: Prisma.TransactionClient
) {
  const execute = async (tx: Prisma.TransactionClient) => {
    // 1. Fetch current project state
    const project = await tx.project.findUnique({
      where: { id: input.projectId },
      include: {
        estates: { select: { isPrimary: true } },
      },
    });

    if (!project) {
      throw new DomainError('NOT_FOUND', 'Proyek tidak ditemukan');
    }

    if (project.deletedAt) {
      throw new DomainError(
        'NOT_FOUND',
        'Proyek tidak ditemukan atau telah dihapus'
      );
    }

    // Check expected status if caller specified one
    if (input.expectedCurrentStatus) {
      const expectedList = Array.isArray(input.expectedCurrentStatus)
        ? input.expectedCurrentStatus
        : [input.expectedCurrentStatus];
      if (!expectedList.includes(project.status)) {
        throw new DomainError(
          'INVALID_TRANSITION',
          `Status proyek saat ini (${project.status}) tidak sesuai dengan yang diharapkan (${expectedList.join(', ')})`
        );
      }
    }

    // 2. Validate transition rules and gates
    validateAllowedTransition(
      project.status,
      input.toStatus,
      project,
      input.reason
    );

    // 3. Prepare mutation data
    const updateData: Prisma.ProjectUpdateInput = {
      status: input.toStatus,
      version: { increment: 1 },
    };

    if (input.toStatus === 'ON_HOLD') {
      updateData.previousStatus = project.status;
      updateData.onHoldReason = input.reason?.trim() ?? null;
    } else if (project.status === 'ON_HOLD') {
      updateData.previousStatus = null;
      updateData.onHoldReason = null;
    }

    if (input.toStatus === 'CANCELLED') {
      updateData.cancelledAt = new Date();
      updateData.cancelReason = input.reason?.trim() ?? null;
      if (input.actorId) {
        updateData.cancelledBy = { connect: { id: input.actorId } };
      }
    }

    if (input.toStatus === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    // 4. Update Project with optimistic lock version check
    const updatedProject = await tx.project.update({
      where: { id: project.id, version: project.version },
      data: updateData,
    });

    // 5. Create immutable ProjectStatusHistory row
    const history = await tx.projectStatusHistory.create({
      data: {
        projectId: project.id,
        fromStatus: project.status,
        toStatus: input.toStatus,
        reason: input.reason?.trim() ?? null,
        actorId: input.actorId ?? null,
      },
    });

    // 6. Record AuditLog in the same transaction
    await recordAuditLog(tx, {
      actorId: input.actorId ?? null,
      projectId: project.id,
      entityType: 'Project',
      entityId: project.id,
      action: 'STATUS_TRANSITION',
      before: {
        status: project.status,
        previousStatus: project.previousStatus,
        version: project.version,
      },
      after: {
        status: input.toStatus,
        previousStatus: updatedProject.previousStatus,
        version: updatedProject.version,
      },
      reason: input.reason?.trim() ?? null,
    });

    return {
      project: updatedProject,
      history,
    };
  };

  if (externalTx) {
    return execute(externalTx);
  }

  return prisma.$transaction(async (tx) => {
    return execute(tx);
  });
}
