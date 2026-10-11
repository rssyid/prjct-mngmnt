import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma, Prisma } from '@/infra/db';
import { createProject } from '@/domain/project/project-service';
import { transitionProjectStatus } from '@/domain/project-transition/transition-service';
import { createApprovalTier } from '@/domain/approval/approval-matrix-service';
import {
  createAfceAttempt,
  patchAfceAttempt,
  replaceBoqItems,
  submitAfceAttempt,
} from '@/domain/afce/afce-service';
import { recordApprovalDecision } from '@/domain/approval/approval-decision-service';
import { DomainError } from '@/shared/errors';
import { ensureStandardTestTiers } from '../helpers/test-tiers';

describe('SAP Approval Decisions, Rejection, and Final Approval Workflow (AC-21 - AC-24)', () => {
  const timestamp = Date.now();
  const testUserId = `user_dec_${timestamp}`;
  const createdProjectIds: string[] = [];
  let testCompanyId = '';
  let testCategoryId = '';
  let testEstateId = '';
  let pos1Id = '';
  let pos2Id = '';

  beforeAll(async () => {
    // 1. User
    await prisma.user.create({
      data: {
        id: testUserId,
        name: 'Decision Test User',
        email: `dec_${timestamp}@example.com`,
        role: 'SUPER_ADMIN',
      },
    });

    // 2. Company, Category, Estate dari seed
    const comp = await prisma.company.findFirstOrThrow();
    testCompanyId = comp.id;

    const cat = await prisma.projectCategory.findFirstOrThrow();
    testCategoryId = cat.id;

    const est = await prisma.estate.findFirstOrThrow({
      where: { companyId: testCompanyId },
    });
    testEstateId = est.id;

    // 5. Positions (ambil dari master seed)
    const positions = await prisma.approvalPosition.findMany({
      orderBy: { rank: 'asc' },
      take: 2,
    });
    pos1Id = positions[0]!.id;
    pos2Id = positions[1]!.id;

    // 6. Tier: pastikan standard tiers tersedia
    await ensureStandardTestTiers();
  }, 30000);

  afterAll(async () => {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL app.allow_purge = 'on'");
      for (const projId of createdProjectIds) {
        await tx.approvalRecord.deleteMany({
          where: { levelSnapshot: { afceAttempt: { projectId: projId } } },
        });
        await tx.approvalLevelSnapshot.deleteMany({
          where: { afceAttempt: { projectId: projId } },
        });
        await tx.boqItem.deleteMany({
          where: { afceAttempt: { projectId: projId } },
        });
        await tx.afceAttempt.deleteMany({
          where: { projectId: projId },
        });
        await tx.budgetEntry.deleteMany({
          where: { projectId: projId },
        });
        await tx.projectStatusHistory.deleteMany({
          where: { projectId: projId },
        });
        await tx.projectEstate.deleteMany({
          where: { projectId: projId },
        });
        await tx.project.deleteMany({
          where: { id: projId },
        });
      }
    });

    await prisma.user.update({
      where: { id: testUserId },
      data: { isActive: false },
    }).catch(() => {});
  });

  it('AC-21 menolak level N bila level N-1 belum approved, dan menolak tanggal masa depan atau lebih awal dari prasyarat', async () => {
    // 1. Setup Proyek
    const proj = await createProject(
      {
        name: `Proyek Validasi Keputusan ${timestamp}`,
        companyId: testCompanyId,
        categoryId: testCategoryId,
        picUserId: testUserId,
        targetStartDate: '2026-11-01',
        targetEndDate: '2026-12-01',
        plannedBudget: 1200000000,
        estates: [{ estateId: testEstateId, isPrimary: true }],
      },
      testUserId
    );
    createdProjectIds.push(proj.id);

    await transitionProjectStatus({
      projectId: proj.id,
      toStatus: 'SURVEY',
      actorId: testUserId,
      reason: 'Mulai Survei',
    });

    const attempt = await createAfceAttempt(
      proj.id,
      { afceNumber: `AFCE-AC21-${timestamp}` },
      testUserId
    );

    await patchAfceAttempt(attempt.id, { rabReady: true }, testUserId);

    await replaceBoqItems(
      attempt.id,
      {
        items: [{ lineNo: 1, activityName: 'Item 1', amount: 1200000000 }],
      },
      testUserId
    );

    // Submit AFCE dengan emailDate = 2026-10-05, submittedDate = 2026-10-06
    await submitAfceAttempt(
      attempt.id,
      {
        submittedDate: '2026-10-06',
        approvalEmailDate: '2026-10-05',
      },
      testUserId
    );

    const snapshots = await prisma.approvalLevelSnapshot.findMany({
      where: { afceAttemptId: attempt.id },
      orderBy: { levelNo: 'asc' },
    });
    expect(snapshots.length).toBeGreaterThanOrEqual(2);

    const snap1 = snapshots[0]!;
    const snap2 = snapshots[1]!;

    // Uji 1: Putuskan Level 2 saat Level 1 belum approved -> ditolak 409
    await expect(
      recordApprovalDecision(
        snap2.id,
        {
          result: 'APPROVED',
          approverName: 'General Manager',
          decisionDate: '2026-10-07',
        },
        testUserId
      )
    ).rejects.toThrowError(/Level 2 hanya dapat diputuskan setelah Level 1 disetujui/);

    // Uji 2: Putuskan Level 1 dengan tanggal sebelum approvalEmailDate (2026-10-04 < 2026-10-05) -> ditolak
    await expect(
      recordApprovalDecision(
        snap1.id,
        {
          result: 'APPROVED',
          approverName: 'Estate Manager',
          decisionDate: '2026-10-04',
        },
        testUserId
      )
    ).rejects.toThrowError(/tidak boleh lebih awal dari tanggal email approval/);

    // Uji 3: Putuskan Level 1 dengan tanggal masa depan (misal tahun 2030) -> ditolak
    await expect(
      recordApprovalDecision(
        snap1.id,
        {
          result: 'APPROVED',
          approverName: 'Estate Manager',
          decisionDate: '2030-01-01',
        },
        testUserId
      )
    ).rejects.toThrowError(/tidak boleh berada di masa depan/);
  }, 30000);

  it('AC-23 keputusan ditolak membuat attempt DITOLAK, proyek kembali ke RAB_READY, dan attempt baru menyalin BOQ', async () => {
    // 1. Setup Proyek
    const proj = await createProject(
      {
        name: `Proyek Ditolak ${timestamp}`,
        companyId: testCompanyId,
        categoryId: testCategoryId,
        picUserId: testUserId,
        targetStartDate: '2026-11-01',
        targetEndDate: '2026-12-01',
        plannedBudget: 1200000000,
        estates: [{ estateId: testEstateId, isPrimary: true }],
      },
      testUserId
    );
    createdProjectIds.push(proj.id);

    await transitionProjectStatus({
      projectId: proj.id,
      toStatus: 'SURVEY',
      actorId: testUserId,
      reason: 'Mulai Survei',
    });

    const attempt1 = await createAfceAttempt(
      proj.id,
      { afceNumber: `AFCE-REJ-${timestamp}` },
      testUserId
    );

    await patchAfceAttempt(attempt1.id, { rabReady: true }, testUserId);

    await replaceBoqItems(
      attempt1.id,
      {
        items: [
          { lineNo: 1, activityName: 'Pekerjaan Saluran', amount: 800000000 },
          { lineNo: 2, activityName: 'Pekerjaan Pintu Air', amount: 400000000 },
        ],
      },
      testUserId
    );

    await submitAfceAttempt(
      attempt1.id,
      {
        submittedDate: '2026-10-06',
        approvalEmailDate: '2026-10-05',
      },
      testUserId
    );

    const snapshots = await prisma.approvalLevelSnapshot.findMany({
      where: { afceAttemptId: attempt1.id },
      orderBy: { levelNo: 'asc' },
    });
    const snap1 = snapshots[0]!;

    // Catat penolakan di level 1
    const rejResult = await recordApprovalDecision(
      snap1.id,
      {
        result: 'REJECTED',
        approverName: 'Estate Manager',
        decisionDate: '2026-10-07',
        notes: 'Anggaran terlalu tinggi, harap revisi volume',
      },
      testUserId
    );

    expect(rejResult.isRejected).toBe(true);
    expect(rejResult.projectStatus).toBe('RAB_READY');

    // Cek attempt 1 berstatus DITOLAK
    const checkAttempt1 = await prisma.afceAttempt.findUnique({
      where: { id: attempt1.id },
    });
    expect(checkAttempt1?.status).toBe('DITOLAK');

    // Cek proyek kembali ke RAB_READY
    const checkProj = await prisma.project.findUnique({
      where: { id: proj.id },
    });
    expect(checkProj?.status).toBe('RAB_READY');

    // Buat attempt 2 (AC-23)
    const attempt2 = await createAfceAttempt(
      proj.id,
      { afceNumber: `AFCE-REJ-2-${timestamp}` },
      testUserId
    );

    expect(attempt2.attemptNo).toBe(2);
    expect(attempt2.status).toBe('DRAFT');
    expect(attempt2.basisAmount.toNumber()).toBe(1200000000); // BOQ otomatis tersalin
    expect(attempt2.boqItems.length).toBe(2);

    // Cek attempt 1 lama tetap utuh
    const attempt1StillIntact = await prisma.afceAttempt.findUnique({
      where: { id: attempt1.id },
    });
    expect(attempt1StillIntact?.status).toBe('DITOLAK');
  }, 30000);

  it('AC-24 approval level terakhir memicu AFCE_AR_APPROVED, BudgetEntry INITIAL, dan immutable triggers', async () => {
    // 1. Setup Proyek
    const proj = await createProject(
      {
        name: `Proyek Approved ${timestamp}`,
        companyId: testCompanyId,
        categoryId: testCategoryId,
        picUserId: testUserId,
        targetStartDate: '2026-11-01',
        targetEndDate: '2026-12-01',
        plannedBudget: 1500000000,
        estates: [{ estateId: testEstateId, isPrimary: true }],
      },
      testUserId
    );
    createdProjectIds.push(proj.id);

    await transitionProjectStatus({
      projectId: proj.id,
      toStatus: 'SURVEY',
      actorId: testUserId,
      reason: 'Mulai Survei',
    });

    const attempt = await createAfceAttempt(
      proj.id,
      { afceNumber: `AFCE-APP-${timestamp}` },
      testUserId
    );

    await patchAfceAttempt(attempt.id, { rabReady: true }, testUserId);

    await replaceBoqItems(
      attempt.id,
      {
        items: [{ lineNo: 1, activityName: 'Pekerjaan Penuh', amount: 1200000000 }],
      },
      testUserId
    );

    await submitAfceAttempt(
      attempt.id,
      {
        submittedDate: '2026-10-06',
        approvalEmailDate: '2026-10-05',
      },
      testUserId
    );

    const snapshots = await prisma.approvalLevelSnapshot.findMany({
      where: { afceAttemptId: attempt.id },
      orderBy: { levelNo: 'asc' },
    });

    // Setujui setiap level secara berurutan
    let lastResult;
    for (let i = 0; i < snapshots.length; i++) {
      const snap = snapshots[i]!;
      lastResult = await recordApprovalDecision(
        snap.id,
        {
          result: 'APPROVED',
          approverName: `Approver Level ${snap.levelNo}`,
          decisionDate: `2026-10-${String(7 + i).padStart(2, '0')}`,
        },
        testUserId
      );
    }

    // Pada level terakhir:
    expect(lastResult?.projectStatus).toBe('AFCE_AR_APPROVED');

    // 1. Attempt status = APPROVED
    const finalAttempt = await prisma.afceAttempt.findUnique({
      where: { id: attempt.id },
    });
    expect(finalAttempt?.status).toBe('APPROVED');

    // 2. BudgetEntry INITIAL dibuat dengan amount = 1.200.000.000
    const budgetInitial = await prisma.budgetEntry.findFirst({
      where: { projectId: proj.id, type: 'INITIAL' },
    });
    expect(budgetInitial).toBeDefined();
    expect(budgetInitial?.amount.toNumber()).toBe(1200000000);

    // 3. plannedBudget proyek tetap utuh (1.500.000.000)
    const checkProj = await prisma.project.findUnique({
      where: { id: proj.id },
    });
    expect(checkProj?.status).toBe('AFCE_AR_APPROVED');
    expect(checkProj?.plannedBudget?.toNumber()).toBe(1500000000);

    // 4. Trigger database: BudgetEntry immutable (update/delete ditolak)
    await expect(
      prisma.budgetEntry.update({
        where: { id: budgetInitial!.id },
        data: { amount: new Prisma.Decimal(999) },
      })
    ).rejects.toThrow();

    await expect(
      prisma.budgetEntry.delete({
        where: { id: budgetInitial!.id },
      })
    ).rejects.toThrow();
  }, 30000);
});
