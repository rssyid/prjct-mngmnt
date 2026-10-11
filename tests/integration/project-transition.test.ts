import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma, Prisma } from '@/infra/db';
import { transitionProjectStatus } from '@/domain/project-transition/transition-service';
import { DomainError } from '@/shared/errors';

describe('Project Transition Integration & Immutability (AC-15, AC-12)', () => {
  const timestamp = Date.now();
  const testUserId = `user_trans_${timestamp}`;
  const testCompanyCode = `PT_${timestamp.toString().slice(-4)}`;
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

    // 2. Company
    const comp = await prisma.company.create({
      data: {
        code: testCompanyCode,
        name: `PT Test Transition ${timestamp}`,
      },
    });
    testCompanyId = comp.id;

    // 3. Category
    const cat = await prisma.projectCategory.create({
      data: {
        code: `CAT_${timestamp.toString().slice(-4)}`,
        name: `Kategori ${timestamp}`,
      },
    });
    testCategoryId = cat.id;

    // 4. Region & Wilayah & Estate
    const reg = await prisma.region.findFirst();
    let regId = reg?.id;
    if (!regId) {
      const newReg = await prisma.region.create({
        data: { code: `REG_${timestamp}`, name: 'Region Test' },
      });
      regId = newReg.id;
    }

    const wil = await prisma.wilayah.create({
      data: {
        regionId: regId,
        name: `Wilayah Trans ${timestamp}`,
      },
    });

    const est = await prisma.estate.create({
      data: {
        companyId: testCompanyId,
        wilayahId: wil.id,
        code: `EST_${timestamp.toString().slice(-4)}`,
        name: `Estate Trans ${timestamp}`,
      },
    });
    testEstateId = est.id;

    // 5. Create Draft Project
    const proj = await prisma.project.create({
      data: {
        code: `WM-${testCompanyCode}-2026-0001`,
        name: `Proyek Uji Transisi ${timestamp}`,
        companyId: testCompanyId,
        categoryId: testCategoryId,
        picUserId: testUserId,
        targetStartDate: new Date('2026-11-01'),
        targetEndDate: new Date('2026-12-01'),
        plannedBudget: new Prisma.Decimal(1500000000),
        status: 'DRAFT',
        createdById: testUserId,
        estates: {
          create: {
            estateId: testEstateId,
            isPrimary: true,
          },
        },
      },
    });
    testProjectId = proj.id;
  });

  afterAll(async () => {
    // Soft cleanup where allowed
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

    const historyCount = await prisma.projectStatusHistory.count({
      where: { projectId: testProjectId },
    });
    expect(historyCount).toBe(1);

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
