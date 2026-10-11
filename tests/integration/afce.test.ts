import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma, Prisma } from '@/infra/db';
import { createProject } from '@/domain/project/project-service';
import { transitionProjectStatus } from '@/domain/project-transition/transition-service';
import { createApprovalTier } from '@/domain/approval/approval-matrix-service';
import {
  createAfceAttempt,
  patchAfceAttempt,
  replaceBoqItems,
  updateAfceLevels,
  submitAfceAttempt,
  listProjectAfceAttempts,
} from '@/domain/afce/afce-service';
import { DomainError } from '@/shared/errors';

describe('AFCE, BOQ, Approval Snapshot & Submission Flow (AC-16 - AC-20)', () => {
  const timestamp = Date.now();
  const testUserId = `user_afce_${timestamp}`;
  let testCompanyId = '';
  let testCategoryId = '';
  let testEstateId = '';
  let testProjectId = '';
  let pos1Id = '';
  let pos2Id = '';
  let pos3Id = '';

  beforeAll(async () => {
    // 1. User
    await prisma.user.create({
      data: {
        id: testUserId,
        name: 'AFCE Test User',
        email: `afce_${timestamp}@example.com`,
        role: 'SUPER_ADMIN',
      },
    });

    // 2. Company
    const comp = await prisma.company.create({
      data: {
        code: `CA_${timestamp.toString().slice(-4)}`,
        name: `PT Company AFCE ${timestamp}`,
      },
    });
    testCompanyId = comp.id;

    // 3. Category
    const cat = await prisma.projectCategory.create({
      data: {
        code: `CAT_${timestamp.toString().slice(-4)}`,
        name: `Kategori AFCE ${timestamp}`,
      },
    });
    testCategoryId = cat.id;

    // 4. Region & Wilayah & Estate
    const reg = await prisma.region.findFirst();
    let regId = reg?.id;
    if (!regId) {
      const newReg = await prisma.region.create({
        data: { code: `REG_${timestamp}`, name: 'Region Test', ops: 'SUMATERA' },
      });
      regId = newReg.id;
    }

    const wil = await prisma.wilayah.create({
      data: { regionId: regId, name: `Wilayah AFCE ${timestamp}` },
    });

    const est = await prisma.estate.create({
      data: {
        companyId: testCompanyId,
        wilayahId: wil.id,
        code: `ES_${timestamp.toString().slice(-4)}`,
        name: `Estate AFCE ${timestamp}`,
      },
    });
    testEstateId = est.id;

    // 5. Positions (ambil dari master jabatan yang sudah di-seed)
    const existingPositions = await prisma.approvalPosition.findMany({
      orderBy: { rank: 'asc' },
      take: 3,
    });
    pos1Id = existingPositions[0]!.id;
    pos2Id = existingPositions[1]!.id;
    pos3Id = existingPositions[2]!.id;

    // 6. Tier: cari tier yang cocok atau buat baru jika belum ada
    const existingTier = await prisma.approvalMatrixTier.findFirst({
      where: {
        isActive: true,
        forAfce: true,
        minAmount: { lte: 1200000000 },
        OR: [{ maxAmount: null }, { maxAmount: { gt: 1200000000 } }],
      },
    });

    if (!existingTier) {
      await createApprovalTier(
        {
          name: `Tier AFCE Uji ${timestamp}`,
          forAfce: true,
          forArSupplement: true,
          minAmount: 500000000,
          maxAmount: 2000000000,
          isActive: true,
          levels: [
            { levelNo: 1, positionId: pos1Id },
            { levelNo: 2, positionId: pos2Id },
            { levelNo: 3, positionId: pos3Id },
          ],
        },
        testUserId
      );
    }

    // 7. Create Project in DRAFT
    const proj = await createProject(
      {
        name: `Proyek Alur AFCE ${timestamp}`,
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
    testProjectId = proj.id;

    // Transition to SURVEY
    await transitionProjectStatus({
      projectId: testProjectId,
      toStatus: 'SURVEY',
      actorId: testUserId,
      reason: 'Mulai Survei',
    });
  }, 30000);

  afterAll(async () => {
    await prisma.user.update({
      where: { id: testUserId },
      data: { isActive: false },
    }).catch(() => {});
  });

  let currentAttemptId = '';

  it('AC-16 membuat attempt AFCE dan penandaan rabReady=true saat SURVEY memicu transisi ke RAB_READY', async () => {
    // 1. Buat AFCE attempt
    const attempt = await createAfceAttempt(
      testProjectId,
      {
        afceNumber: `AFCE-WM-${timestamp}`,
        documentDate: '2026-10-10',
        notes: 'Draft awal AFCE',
      },
      testUserId
    );

    expect(attempt).toBeDefined();
    expect(attempt.attemptNo).toBe(1);
    expect(attempt.status).toBe('DRAFT');
    expect(attempt.rabReady).toBe(false);
    currentAttemptId = attempt.id;

    // 2. Tandai rabReady = true -> memicu transisi proyek ke RAB_READY
    const patched = await patchAfceAttempt(
      currentAttemptId,
      { rabReady: true },
      testUserId
    );

    expect(patched.rabReady).toBe(true);

    const projectAfter = await prisma.project.findUnique({
      where: { id: testProjectId },
    });
    expect(projectAfter?.status).toBe('RAB_READY');
  });

  it('AC-17 & AC-18 mengisi baris BOQ menghitung total basisAmount dan mencocokkan tier matriks approval', async () => {
    const updated = await replaceBoqItems(
      currentAttemptId,
      {
        items: [
          {
            lineNo: 1,
            buildingName: 'Saluran Primer',
            activityName: 'Pengerukan Saluran Primer 1,2 km',
            amount: 700000000,
          },
          {
            lineNo: 2,
            buildingName: 'Pintu Air',
            activityName: 'Pembangunan 2 Unit Pintu Air',
            amount: 500000000,
          },
        ],
      },
      testUserId
    );

    // AC-17: basisAmount = total BOQ = 1.200.000.000
    expect(updated.basisAmount.toNumber()).toBe(1200000000);
    expect(updated.boqItems.length).toBe(2);

    // AC-18: Level disalin dari tier yang cocok (3 level: EM, GEM, RH)
    expect(updated.matrixTierId).toBeTruthy();
    expect(updated.levels.length).toBe(3);
    expect(updated.levels[0]?.levelNo).toBe(1);
    expect(updated.levels[0]?.positionId).toBe(pos1Id);
  });

  it('AC-19 kustomisasi level approval saat DRAFT diaudit dan ditandai berbeda dari matriks', async () => {
    // Ubah urutan level menjadi: Level 1 = GEM, Level 2 = RH (tanpa EM)
    const customLevels = await updateAfceLevels(
      currentAttemptId,
      {
        levels: [
          { levelNo: 1, positionId: pos2Id },
          { levelNo: 2, positionId: pos3Id },
        ],
      },
      testUserId
    );

    expect(customLevels.levels.length).toBe(2);
    expect(customLevels.levels[0]?.positionId).toBe(pos2Id);

    // Verifikasi listProjectAfceAttempts menandai isDifferentFromMatrix = true
    const list = await listProjectAfceAttempts(testProjectId);
    const att = list.find((a) => a.id === currentAttemptId);
    expect(att?.isDifferentFromMatrix).toBe(true);
  });

  it('AC-20 pengajuan AFCE mengunci BOQ & level, dan memicu transisi proyek ke WAITING_AFCE_AR', async () => {
    const submitResult = await submitAfceAttempt(
      currentAttemptId,
      {
        submittedDate: '2026-10-11',
        approvalEmailDate: '2026-10-10',
      },
      testUserId
    );

    expect(submitResult.attempt.status).toBe('DIAJUKAN');
    expect(submitResult.projectStatus).toBe('WAITING_AFCE_AR');

    // Cek di DB
    const projInDb = await prisma.project.findUnique({
      where: { id: testProjectId },
    });
    expect(projInDb?.status).toBe('WAITING_AFCE_AR');

    // AC-17: Percobaan mengubah BOQ setelah submit ditolak (FIELD_INPUT_LOCKED)
    await expect(
      replaceBoqItems(
        currentAttemptId,
        {
          items: [{ lineNo: 1, activityName: 'Coba ubah', amount: 1000000 }],
        },
        testUserId
      )
    ).rejects.toThrowError(/terkunci/);

    // AC-19: Percobaan mengubah level setelah submit ditolak (FIELD_INPUT_LOCKED)
    await expect(
      updateAfceLevels(
        currentAttemptId,
        {
          levels: [{ levelNo: 1, positionId: pos1Id }],
        },
        testUserId
      )
    ).rejects.toThrowError(/Level approval hanya dapat diubah saat AFCE berstatus DRAFT/);
  });
});
