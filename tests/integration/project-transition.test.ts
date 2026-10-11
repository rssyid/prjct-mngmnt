import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma, Prisma } from '@/infra/db';
import { createProject } from '@/domain/project/project-service';
import { transitionProjectStatus } from '@/domain/project-transition/transition-service';
import { DomainError } from '@/shared/errors';

describe('Project Transition Integration & Immutability (AC-15, AC-12)', () => {
  const timestamp = Date.now();
  const testUserId = `user_trans_${timestamp}`;
  let testCompanyCode = '';
  let testCompanyId = '';
  let testCategoryId = '';
  let testEstateId = '';
  let testProjectId = '';

  beforeAll(async () => {
    // 1. User
    await prisma.user.create({
      data: {
        id: testUserId,
        name: 'Transition Test User',
        email: `trans_${timestamp}@example.com`,
        role: 'SUPER_ADMIN',
      },
    });

    // 2. Gunakan Company, Category, dan Estate dari seed
    const comp = await prisma.company.findFirstOrThrow();
    testCompanyId = comp.id;
    testCompanyCode = comp.code;

    const cat = await prisma.projectCategory.findFirstOrThrow();
    testCategoryId = cat.id;

    const est = await prisma.estate.findFirstOrThrow({
      where: { companyId: testCompanyId },
    });
    testEstateId = est.id;

    // 5. Create Draft Project
    const proj = await createProject(
      {
        name: `Proyek Uji Transisi ${timestamp}`,
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
    testProjectId = proj.id;
  });

  afterAll(async () => {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL app.allow_purge = 'on'");
      if (testProjectId) {
        await tx.projectStatusHistory.deleteMany({ where: { projectId: testProjectId } });
        await tx.projectEstate.deleteMany({ where: { projectId: testProjectId } });
        await tx.project.deleteMany({ where: { id: testProjectId } });
      }
    });

    await prisma.user.update({
      where: { id: testUserId },
      data: { isActive: false },
    }).catch(() => {});
  });

  it('AC-15 transisi DRAFT -> SURVEY mencatat ProjectStatusHistory dan AuditLog dalam transaksi yang sama', async () => {
    const result = await transitionProjectStatus({
      projectId: testProjectId,
      toStatus: 'SURVEY',
      actorId: testUserId,
      reason: 'Mulai survei lapangan',
    });

    expect(result.project.status).toBe('SURVEY');
    expect(result.history.fromStatus).toBe('DRAFT');
    expect(result.history.toStatus).toBe('SURVEY');
    expect(result.history.reason).toBe('Mulai survei lapangan');

    // Cek di DB
    const savedProject = await prisma.project.findUnique({
      where: { id: testProjectId },
    });
    expect(savedProject?.status).toBe('SURVEY');

    const historyEntries = await prisma.projectStatusHistory.findMany({
      where: { projectId: testProjectId },
      orderBy: { at: 'asc' },
    });
    expect(historyEntries.length).toBe(2);
    expect(historyEntries[1]?.fromStatus).toBe('DRAFT');
    expect(historyEntries[1]?.toStatus).toBe('SURVEY');

    const audit = await prisma.auditLog.findFirst({
      where: {
        projectId: testProjectId,
        action: 'STATUS_TRANSITION',
      },
    });
    expect(audit).toBeDefined();
    expect(audit?.entityType).toBe('Project');
    expect(audit?.actorId).toBe(testUserId);
  });

  it('AC-15 transisi ke ON_HOLD menyimpan previousStatus dan onHoldReason, dan resume mengembalikannya', async () => {
    // Tahan
    const holdResult = await transitionProjectStatus({
      projectId: testProjectId,
      toStatus: 'ON_HOLD',
      actorId: testUserId,
      reason: 'Izin amdal belum selesai',
    });

    expect(holdResult.project.status).toBe('ON_HOLD');
    expect(holdResult.project.previousStatus).toBe('SURVEY');
    expect(holdResult.project.onHoldReason).toBe('Izin amdal belum selesai');

    // Lanjutkan
    const resumeResult = await transitionProjectStatus({
      projectId: testProjectId,
      toStatus: 'SURVEY',
      actorId: testUserId,
    });

    expect(resumeResult.project.status).toBe('SURVEY');
    expect(resumeResult.project.previousStatus).toBeNull();
    expect(resumeResult.project.onHoldReason).toBeNull();
  });

  it('AC-15 trigger database menolak modifikasi atau penghapusan pada ProjectStatusHistory (immutable)', async () => {
    const latestHistory = await prisma.projectStatusHistory.findFirst({
      where: { projectId: testProjectId },
      orderBy: { at: 'desc' },
    });

    expect(latestHistory).toBeDefined();
    if (!latestHistory) return;

    // Percobaan update harus ditolak trigger
    await expect(
      prisma.projectStatusHistory.update({
        where: { id: latestHistory.id },
        data: { reason: 'Coba ubah riwayat' },
      })
    ).rejects.toThrow();

    // Percobaan delete harus ditolak trigger
    await expect(
      prisma.projectStatusHistory.delete({
        where: { id: latestHistory.id },
      })
    ).rejects.toThrow();
  });

  it('AC-15 menolak transisi status ilegal dengan 409 INVALID_TRANSITION', async () => {
    // Saat ini status = SURVEY; lompat langsung ke COMPLETED ditolak
    await expect(
      transitionProjectStatus({
        projectId: testProjectId,
        toStatus: 'COMPLETED',
        actorId: testUserId,
      })
    ).rejects.toThrowError(DomainError);
  });
});
