import { prisma, Prisma } from '@/infra/db';
import { DomainError } from '@/shared/errors';
import { recordAuditLog } from '@/domain/audit/audit-service';
import { transitionProjectStatus } from '@/domain/project-transition/transition-service';
import type { RecordApprovalDecisionInput } from '@/shared/schemas/approval-record';
import { getCurrentWibDate, toBusinessDateString } from '@/shared/lib/date';
import { differenceInCalendarDays } from 'date-fns';

export function calculateLevelDurationDays(
  levelNo: number,
  decisionDate: Date,
  referenceDate: Date
): number {
  const diff = differenceInCalendarDays(decisionDate, referenceDate);
  return Math.max(0, diff);
}

export async function recordApprovalDecision(
  levelSnapshotId: string,
  input: RecordApprovalDecisionInput,
  actorId: string
) {
  return prisma.$transaction(async (tx) => {
    // 1. Fetch Snapshot with Document info and existing Record
    const snapshot = await tx.approvalLevelSnapshot.findUnique({
      where: { id: levelSnapshotId },
      include: {
        record: true,
        afceAttempt: {
          include: { project: true },
        },
        arSupplement: {
          include: { project: true },
        },
      },
    });

    if (!snapshot) {
      throw new DomainError('NOT_FOUND', 'Level approval snapshot tidak ditemukan');
    }

    if (snapshot.record) {
      throw new DomainError(
        'ACTIVE_CONFLICT',
        'Keputusan untuk level approval ini sudah pernah dicatat'
      );
    }

    const docType = snapshot.afceAttemptId ? 'AFCE' : 'AR';
    const docStatus = snapshot.afceAttemptId
      ? snapshot.afceAttempt?.status
      : snapshot.arSupplement?.status;
    const approvalEmailDate = snapshot.afceAttemptId
      ? snapshot.afceAttempt?.approvalEmailDate
      : snapshot.arSupplement?.approvalEmailDate;
    const projectId = snapshot.afceAttemptId
      ? snapshot.afceAttempt?.projectId
      : snapshot.arSupplement?.projectId;

    if (!projectId || !docStatus || !approvalEmailDate) {
      throw new DomainError('NOT_FOUND', 'Dokumen approval terkait tidak valid');
    }

    if (docStatus !== 'DIAJUKAN') {
      throw new DomainError(
        'INVALID_TRANSITION',
        `Keputusan approval hanya dapat dicatat saat dokumen berstatus DIAJUKAN (saat ini: ${docStatus})`
      );
    }

    // 2. Urutan Level (AC-21): Level N hanya setelah Level N-1 Approved
    if (snapshot.levelNo > 1) {
      const prevSnapshot = await tx.approvalLevelSnapshot.findFirst({
        where: {
          ...(snapshot.afceAttemptId
            ? { afceAttemptId: snapshot.afceAttemptId }
            : { arSupplementId: snapshot.arSupplementId }),
          levelNo: snapshot.levelNo - 1,
        },
        include: { record: true },
      });

      if (!prevSnapshot || !prevSnapshot.record || prevSnapshot.record.result !== 'APPROVED') {
        throw new DomainError(
          'PRECONDITION_FAILED',
          `Level ${snapshot.levelNo} hanya dapat diputuskan setelah Level ${snapshot.levelNo - 1} disetujui (Approved)`
        );
      }

      // Validasi tanggal: level > 1 tidak boleh lebih awal dari keputusan level sebelumnya
      const prevDecisionStr = toBusinessDateString(prevSnapshot.record.decisionDate);
      if (input.decisionDate < prevDecisionStr) {
        throw new DomainError(
          'PRECONDITION_FAILED',
          `Tanggal keputusan level ${snapshot.levelNo} (${input.decisionDate}) tidak boleh lebih awal dari keputusan level sebelumnya (${prevDecisionStr})`
        );
      }
    } else {
      // Level 1: tidak boleh lebih awal dari tanggal email approval (AC-21)
      const emailDateStr = toBusinessDateString(approvalEmailDate);
      if (input.decisionDate < emailDateStr) {
        throw new DomainError(
          'PRECONDITION_FAILED',
          `Tanggal keputusan level 1 (${input.decisionDate}) tidak boleh lebih awal dari tanggal email approval (${emailDateStr})`
        );
      }
    }

    // Validasi tanggal: tidak boleh di masa depan (AC-21)
    const todayWibStr = toBusinessDateString(getCurrentWibDate());
    if (input.decisionDate > todayWibStr) {
      throw new DomainError(
        'PRECONDITION_FAILED',
        'Tanggal keputusan tidak boleh berada di masa depan'
      );
    }

    const decisionDateObj = new Date(input.decisionDate);
    const normalizedResult: 'APPROVED' | 'DITOLAK' =
      input.result === 'REJECTED' || input.result === 'DITOLAK'
        ? 'DITOLAK'
        : 'APPROVED';

    // 3. Create immutable ApprovalRecord
    const record = await tx.approvalRecord.create({
      data: {
        levelSnapshotId: snapshot.id,
        result: normalizedResult,
        approverName: input.approverName.trim(),
        decisionDate: decisionDateObj,
        notes: input.notes?.trim() ?? null,
        recordedById: actorId,
      },
    });

    let updatedProjectStatus: string | null = null;

    // 4. Handle Penolakan (AC-23)
    if (normalizedResult === 'DITOLAK') {
      if (docType === 'AFCE' && snapshot.afceAttemptId) {
        // AFCE ditolak: attempt -> DITOLAK, proyek -> RAB_READY
        await tx.afceAttempt.update({
          where: { id: snapshot.afceAttemptId },
          data: {
            status: 'DITOLAK',
            decidedDate: decisionDateObj,
          },
        });

        const trans = await transitionProjectStatus(
          {
            projectId,
            toStatus: 'RAB_READY',
            actorId,
            reason: `AFCE ditolak pada level ${snapshot.levelNo} oleh ${input.approverName}`,
          },
          tx
        );
        updatedProjectStatus = trans.project.status;
      } else if (docType === 'AR' && snapshot.arSupplementId) {
        await tx.arSupplement.update({
          where: { id: snapshot.arSupplementId },
          data: {
            status: 'DITOLAK',
            decidedDate: decisionDateObj,
          },
        });
      }
    }

    // 5. Handle Persetujuan (AC-24)
    if (normalizedResult === 'APPROVED') {
      // Cek apakah ini level terakhir pada dokumen
      const totalLevels = await tx.approvalLevelSnapshot.count({
        where: {
          ...(snapshot.afceAttemptId
            ? { afceAttemptId: snapshot.afceAttemptId }
            : { arSupplementId: snapshot.arSupplementId }),
        },
      });

      const isLastLevel = snapshot.levelNo === totalLevels;

      if (isLastLevel) {
        if (docType === 'AFCE' && snapshot.afceAttemptId && snapshot.afceAttempt) {
          // Update attempt -> APPROVED
          await tx.afceAttempt.update({
            where: { id: snapshot.afceAttemptId },
            data: {
              status: 'APPROVED',
              decidedDate: decisionDateObj,
            },
          });

          // Buat BudgetEntry INITIAL = basisAmount (AC-24)
          await tx.budgetEntry.create({
            data: {
              projectId,
              type: 'INITIAL',
              amount: snapshot.afceAttempt.basisAmount,
              effectiveDate: decisionDateObj,
              createdById: actorId,
            },
          });

          // Transisi proyek ke AFCE_AR_APPROVED (AC-24)
          const trans = await transitionProjectStatus(
            {
              projectId,
              toStatus: 'AFCE_AR_APPROVED',
              actorId,
              reason: 'AFCE disetujui pada level terakhir',
            },
            tx
          );
          updatedProjectStatus = trans.project.status;
        } else if (docType === 'AR' && snapshot.arSupplementId && snapshot.arSupplement) {
          // AR disetujui level terakhir (AC-25)
          await tx.arSupplement.update({
            where: { id: snapshot.arSupplementId },
            data: {
              status: 'APPROVED',
              decidedDate: decisionDateObj,
            },
          });

          // Buat BudgetEntry AR_SUPPLEMENT (AC-25)
          await tx.budgetEntry.create({
            data: {
              projectId,
              type: 'AR_SUPPLEMENT',
              amount: snapshot.arSupplement.amount,
              arSupplementId: snapshot.arSupplement.id,
              effectiveDate: decisionDateObj,
              createdById: actorId,
            },
          });
          // Proyek status tetap tidak berubah (AC-25)
        }
      }
    }

    await recordAuditLog(tx, {
      actorId,
      projectId,
      entityType: 'ApprovalRecord',
      entityId: record.id,
      action: 'RECORD_APPROVAL_DECISION',
      after: {
        docType,
        levelNo: snapshot.levelNo,
        result: input.result,
        approverName: input.approverName,
        decisionDate: input.decisionDate,
      },
    });

    return {
      record,
      docType,
      isRejected: input.result === 'REJECTED',
      projectStatus: updatedProjectStatus,
    };
  });
}
