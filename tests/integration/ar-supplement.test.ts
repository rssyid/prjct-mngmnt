import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma, Prisma } from '@/infra/db';
import { createProject } from '@/domain/project/project-service';
import { transitionProjectStatus } from '@/domain/project-transition/transition-service';
import {
  createArSupplement,
  patchArSupplement,
  updateArLevels,
  submitArSupplement,
  listProjectArSupplements,
} from '@/domain/ar/ar-supplement-service';
import { getProjectBudgetSummary } from '@/domain/budget/budget-service';
import { recordApprovalDecision } from '@/domain/approval/approval-decision-service';
import { DomainError } from '@/shared/errors';

describe('AR Supplement & Budget Expansion Integration Test (AC-25)', () => {
  const timestamp = Date.now();
  const testUserId = `user_ar_${timestamp}`;
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
        name: 'AR Test User',
        email: `ar_${timestamp}@example.com`,
        role: 'SUPER_ADMIN',
      },
    });

    // 2. Company
    const comp = await prisma.company.create({
      data: {
        code: `CA_${timestamp.toString().slice(-4)}`,
        name: `PT Company AR ${timestamp}`,
      },
    });
    testCompanyId = comp.id;

    // 3. Category
    const cat = await prisma.projectCategory.create({
      data: {
        code: `CAT_${timestamp.toString().slice(-4)}`,
        name: `Kategori AR ${timestamp}`,
      },
    });
    testCategoryId = cat.id;

    // 4. Region & Wilayah & Estate
    const reg = await prisma.region.findFirst();
    let regId = reg?.id;
    if (!regId) {
      const newReg = await prisma.region.create({
        data: { code: `REG_${timestamp}`, name: 'Region Test AR', ops: 'SUMATERA' },
      });
      regId = newReg.id;
    }

    const wil = await prisma.wilayah.create({
      data: { regionId: regId, name: `Wilayah AR ${timestamp}` },
    });

    const est = await prisma.estate.create({
      data: {
        companyId: testCompanyId,
        wilayahId: wil.id,
        code: `EA_${timestamp.toString().slice(-4)}`,
        name: `Estate AR ${timestamp}`,
      },
    });
    testEstateId = est.id;

    // 5. Positions (ambil dari master seed)
    const positions = await prisma.approvalPosition.findMany({
      orderBy: { rank: 'asc' },
      take: 2,
    });
    pos1Id = positions[0]!.id;
    pos2Id = positions[1]!.id;
  }, 30000);

  afterAll(async () => {
    await prisma.user
      .update({
        where: { id: testUserId },
        data: { isActive: false },
      })
      .catch(() => {});
  });

  it('AC-25 menolak pengajuan AR tambahan pada proyek yang COMPLETED atau CANCELLED', async () => {
    // Buat proyek lalu batalkan
    const proj = await createProject(
      {
        name: `Proyek Cancelled AR ${timestamp}`,
        companyId: testCompanyId,
        categoryId: testCategoryId,
        picUserId: testUserId,
        targetStartDate: '2026-11-01',
        targetEndDate: '2026-12-01',
        plannedBudget: 500000000,
        estates: [{ estateId: testEstateId, isPrimary: true }],
      },
      testUserId
    );

    await transitionProjectStatus({
      projectId: proj.id,
      toStatus: 'CANCELLED',
      actorId: testUserId,
      reason: 'Proyek dibatalkan untuk uji kunci AR',
    });

    await expect(
      createArSupplement(
        proj.id,
        {
          amount: 50000000,
          reason: 'Penambahan pipa pompa',
          date: '2026-11-05',
        },
        testUserId
      )
    ).rejects.toThrowError(
      /AR tambahan tidak dapat diajukan pada proyek yang telah selesai atau dibatalkan/
    );
  });

  it('AC-25 mencatat AR tambahan sebagai suplemen terpisah dengan tier tersendiri, mendukung penyesuaian DRAFT, dan submit', async () => {
    // 1. Setup Proyek aktif
    const proj = await createProject(
      {
        name: `Proyek AR Workflow ${timestamp}`,
        companyId: testCompanyId,
        categoryId: testCategoryId,
        picUserId: testUserId,
        targetStartDate: '2026-11-01',
        targetEndDate: '2026-12-01',
        plannedBudget: 800000000,
        estates: [{ estateId: testEstateId, isPrimary: true }],
      },
      testUserId
    );

    await transitionProjectStatus({
      projectId: proj.id,
      toStatus: 'SURVEY',
      actorId: testUserId,
      reason: 'Survey',
    });
    await transitionProjectStatus({
      projectId: proj.id,
      toStatus: 'RAB_READY',
      actorId: testUserId,
      reason: 'RAB',
    });
    await transitionProjectStatus({
      projectId: proj.id,
      toStatus: 'WAITING_AFCE_AR',
      actorId: testUserId,
      reason: 'AFCE Submitted',
    });
    await transitionProjectStatus({
      projectId: proj.id,
      toStatus: 'AFCE_AR_APPROVED',
      actorId: testUserId,
      reason: 'AFCE Approved',
    });

    // Buat initial budget entry (misal AFCE 800 Jt)
    await prisma.budgetEntry.create({
      data: {
        projectId: proj.id,
        type: 'INITIAL',
        amount: new Prisma.Decimal(800000000),
        effectiveDate: new Date('2026-10-02'),
        createdById: testUserId,
      },
    });

    // 2. Buat AR Tambahan (misal 150 Jt)
    const ar = await createArSupplement(
      proj.id,
      {
        number: 'AR/SUP/001',
        amount: 150000000,
        reason: 'Penambahan debit pompa dan jaringan drainase',
        date: '2026-10-03',
      },
      testUserId
    );

    expect(ar.status).toBe('DRAFT');
    expect(ar.amount.toString()).toBe('150000000');
    expect(ar.levels.length).toBeGreaterThanOrEqual(1);

    // 3. Patch DRAFT AR
    const patched = await patchArSupplement(
      ar.id,
      {
        amount: 175000000,
        reason: 'Penambahan debit pompa dan pelebaran parit',
        version: ar.version,
      },
      testUserId
    );
    expect(patched.amount.toString()).toBe('175000000');
    expect(patched.reason).toContain('pelebaran parit');

    // 4. Update snapshot level custom
    const updatedLevels = await updateArLevels(
      ar.id,
      {
        levels: [
          { levelNo: 1, positionId: pos1Id },
          { levelNo: 2, positionId: pos2Id },
        ],
        version: patched.version,
      },
      testUserId
    );
    expect(updatedLevels.levels).toHaveLength(2);

    // 5. Submit AR
    const submitted = await submitArSupplement(
      ar.id,
      {
        submittedDate: '2026-10-05',
        approvalEmailDate: '2026-10-04',
        version: updatedLevels.version,
      },
      testUserId
    );
    expect(submitted.status).toBe('DIAJUKAN');

    // Cek list
    const arList = await listProjectArSupplements(proj.id);
    expect(arList).toHaveLength(1);
    expect(arList[0]?.status).toBe('DIAJUKAN');

    // 6. Record Decisions
    // Level 1: APPROVED
    const lvl1 = submitted.levels[0]!;
    const dec1 = await recordApprovalDecision(
      lvl1.id,
      {
        approverName: 'Approver Level 1',
        decisionDate: '2026-10-06',
        result: 'APPROVED',
        notes: 'Setuju secara teknis',
      },
      testUserId
    );
    expect(dec1.record.result).toBe('APPROVED');
    expect(dec1.projectStatus).toBeNull(); // Status proyek tidak berubah

    // Level 2 (Terakhir): APPROVED -> Harus membuat BudgetEntry tipe AR_SUPPLEMENT dan TIDAK mengubah status proyek
    const lvl2 = submitted.levels[1]!;
    const dec2 = await recordApprovalDecision(
      lvl2.id,
      {
        approverName: 'Approver Level 2 Final',
        decisionDate: '2026-10-07',
        result: 'APPROVED',
        notes: 'Persetujuan anggaran final',
      },
      testUserId
    );
    expect(dec2.record.result).toBe('APPROVED');
    expect(dec2.projectStatus).toBeNull(); // Status proyek tetap AFCE_AR_APPROVED

    // Verifikasi status proyek tetap sama
    const updatedProj = await prisma.project.findUniqueOrThrow({
      where: { id: proj.id },
    });
    expect(updatedProj.status).toBe('AFCE_AR_APPROVED');

    // Verifikasi AR berstatus APPROVED
    const finalAr = await prisma.arSupplement.findUniqueOrThrow({
      where: { id: ar.id },
      include: { budgetEntry: true },
    });
    expect(finalAr.status).toBe('APPROVED');
    expect(finalAr.budgetEntry).not.toBeNull();
    expect(finalAr.budgetEntry?.type).toBe('AR_SUPPLEMENT');
    expect(finalAr.budgetEntry?.amount.toString()).toBe('175000000');

    // 7. Verifikasi Budget Summary
    const budgetSummary = await getProjectBudgetSummary(proj.id);
    expect(budgetSummary.initialEntry?.amount.toString()).toBe('800000000');
    expect(budgetSummary.arEntries).toHaveLength(1);
    expect(budgetSummary.arEntries[0]?.amount.toString()).toBe('175000000');
    // Total official budget = 800 Jt + 175 Jt = 975 Jt
    expect(budgetSummary.totalOfficialBudget.toString()).toBe('975000000');
  });

  it('AC-25 jika AR tambahan ditolak, status AR menjadi DITOLAK tanpa mengubah anggaran resmi atau status proyek', async () => {
    // 1. Setup Proyek
    const proj = await createProject(
      {
        name: `Proyek AR Ditolak ${timestamp}`,
        companyId: testCompanyId,
        categoryId: testCategoryId,
        picUserId: testUserId,
        targetStartDate: '2026-11-01',
        targetEndDate: '2026-12-01',
        plannedBudget: 400000000,
        estates: [{ estateId: testEstateId, isPrimary: true }],
      },
      testUserId
    );

    await transitionProjectStatus({
      projectId: proj.id,
      toStatus: 'SURVEY',
      actorId: testUserId,
      reason: 'Survey',
    });
    await transitionProjectStatus({
      projectId: proj.id,
      toStatus: 'RAB_READY',
      actorId: testUserId,
      reason: 'RAB',
    });
    await transitionProjectStatus({
      projectId: proj.id,
      toStatus: 'WAITING_AFCE_AR',
      actorId: testUserId,
      reason: 'AFCE Submitted',
    });
    await transitionProjectStatus({
      projectId: proj.id,
      toStatus: 'AFCE_AR_APPROVED',
      actorId: testUserId,
      reason: 'AFCE Approved',
    });

    const ar = await createArSupplement(
      proj.id,
      {
        number: 'AR/REJ/001',
        amount: 80000000,
        reason: 'Penambahan sewa genset',
        date: '2026-10-05',
      },
      testUserId
    );

    const submitted = await submitArSupplement(
      ar.id,
      {
        submittedDate: '2026-10-05',
        approvalEmailDate: '2026-10-04',
        version: ar.version,
      },
      testUserId
    );

    // Tolak di level 1
    const lvl1 = submitted.levels[0]!;
    const dec = await recordApprovalDecision(
      lvl1.id,
      {
        approverName: 'Direktur Ops',
        decisionDate: '2026-10-06',
        result: 'DITOLAK',
        notes: 'Tidak disetujui, gunakan genset existing',
      },
      testUserId
    );

    expect(dec.record.result).toBe('DITOLAK');
    expect(dec.projectStatus).toBeNull();

    // Verifikasi status AR
    const rejectedAr = await prisma.arSupplement.findUniqueOrThrow({
      where: { id: ar.id },
    });
    expect(rejectedAr.status).toBe('DITOLAK');

    // Verifikasi tidak ada budget entry terbentuk
    const budgetSummary = await getProjectBudgetSummary(proj.id);
    expect(budgetSummary.arEntries).toHaveLength(0);
    expect(budgetSummary.totalOfficialBudget.toString()).toBe('0');

    // Status proyek tetap
    const projCheck = await prisma.project.findUniqueOrThrow({
      where: { id: proj.id },
    });
    expect(projCheck.status).toBe('AFCE_AR_APPROVED');
  });

  it('memastikan trigger database menolak update atau delete pada budget entry yang sudah tercatat', async () => {
    const proj = await createProject(
      {
        name: `Proyek Immutable Budget ${timestamp}`,
        companyId: testCompanyId,
        categoryId: testCategoryId,
        picUserId: testUserId,
        targetStartDate: '2026-11-01',
        targetEndDate: '2026-12-01',
        plannedBudget: 300000000,
        estates: [{ estateId: testEstateId, isPrimary: true }],
      },
      testUserId
    );

    const entry = await prisma.budgetEntry.create({
      data: {
        projectId: proj.id,
        type: 'INITIAL',
        amount: new Prisma.Decimal(300000000),
        effectiveDate: new Date('2026-11-01'),
        createdById: testUserId,
      },
    });

    // Coba UPDATE via raw SQL
    await expect(
      prisma.$executeRawUnsafe(
        `UPDATE "BudgetEntry" SET "amount" = 350000000 WHERE "id" = '${entry.id}'`
      )
    ).rejects.toThrow();

    // Coba DELETE via raw SQL
    await expect(
      prisma.$executeRawUnsafe(
        `DELETE FROM "BudgetEntry" WHERE "id" = '${entry.id}'`
      )
    ).rejects.toThrow();
  });
});
