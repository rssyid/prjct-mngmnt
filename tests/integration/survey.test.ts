import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma, Prisma } from '@/infra/db';
import { createProject } from '@/domain/project/project-service';
import { upsertProjectSurvey, getProjectSurvey } from '@/domain/survey/survey-service';
import { DomainError } from '@/shared/errors';

describe('Project Survey & AFCE Locking Gate (AC-14)', () => {
  const timestamp = Date.now();
  const testUserId = `user_survey_${timestamp}`;
  let testCompanyId = '';
  let testCategoryId = '';
  let testEstateId = '';
  let testProjectId = '';

  beforeAll(async () => {
    // 1. User
    await prisma.user.create({
      data: {
        id: testUserId,
        name: 'Survey Test User',
        email: `survey_${timestamp}@example.com`,
        role: 'SUPER_ADMIN',
      },
    });

    // 2. Gunakan Company, Category, dan Estate dari seed
    const comp = await prisma.company.findFirstOrThrow();
    testCompanyId = comp.id;

    const cat = await prisma.projectCategory.findFirstOrThrow();
    testCategoryId = cat.id;

    const est = await prisma.estate.findFirstOrThrow({
      where: { companyId: testCompanyId },
    });
    testEstateId = est.id;

    // 3. Create Project
    const project = await createProject(
      {
        name: `Proyek Uji Survei ${timestamp}`,
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
    testProjectId = project.id;
  });

  afterAll(async () => {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL app.allow_purge = 'on'");
      if (testProjectId) {
        await tx.approvalLevelSnapshot.deleteMany({
          where: { afceAttempt: { projectId: testProjectId } },
        });
        await tx.afceAttempt.deleteMany({ where: { projectId: testProjectId } });
        await tx.survey.deleteMany({ where: { projectId: testProjectId } });
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

  it('AC-14 berhasil mencatat data survei dengan koordinat dan rekomendasi', async () => {
    const survey = await upsertProjectSurvey(
      testProjectId,
      {
        surveyDate: '2026-10-15',
        surveyorNames: 'Budi & Joko (Tim Survei HO)',
        existingCondition: 'Saluran primer mengalami sedimentasi berat sepanjang 1,2 km',
        recommendation: 'Pengerukan mekanis menggunakan excavator long-arm',
        latitude: -0.123456,
        longitude: 102.654321,
        notes: 'Akses jalan tanah dapat dilalui truk',
      },
      testUserId
    );

    expect(survey).toBeDefined();
    expect(survey.surveyorNames).toBe('Budi & Joko (Tim Survei HO)');
    expect(survey.latitude?.toNumber()).toBeCloseTo(-0.123456, 5);
    expect(survey.version).toBe(1);

    // Verifikasi get survey
    const fetched = await getProjectSurvey(testProjectId);
    expect(fetched.survey).toBeDefined();
    expect(fetched.survey?.id).toBe(survey.id);
    expect(fetched.isLocked).toBe(false);
  });

  it('AC-14 dapat memperbarui survei dan mencatat audit log', async () => {
    const initial = await getProjectSurvey(testProjectId);
    expect(initial.survey).toBeDefined();

    const updated = await upsertProjectSurvey(
      testProjectId,
      {
        surveyDate: '2026-10-16',
        surveyorNames: 'Budi, Joko, & Ahmad',
        existingCondition: 'Saluran primer dan sekunder mengalami sedimentasi',
        recommendation: 'Pengerukan saluran primer dan penambahan pintu air',
        latitude: -0.123456,
        longitude: 102.654321,
        version: initial.survey!.version,
      },
      testUserId
    );

    expect(updated.version).toBe(2);
    expect(updated.surveyorNames).toBe('Budi, Joko, & Ahmad');

    // Cek AuditLog
    const audit = await prisma.auditLog.findFirst({
      where: {
        projectId: testProjectId,
        entityType: 'Survey',
        action: 'UPDATE_SURVEY',
      },
    });
    expect(audit).toBeDefined();
  });

  it('AC-14 mengunci survei setelah AFCE pertama diajukan (FIELD_INPUT_LOCKED)', async () => {
    // Buat AFCE attempt yang sudah diajukan (submittedDate != null)
    await prisma.afceAttempt.create({
      data: {
        projectId: testProjectId,
        attemptNo: 1,
        status: 'DIAJUKAN',
        basisAmount: new Prisma.Decimal(1200000000),
        submittedDate: new Date('2026-10-20'),
        approvalEmailDate: new Date('2026-10-19'),
        version: 1,
      },
    });

    // Verifikasi flag isLocked bernilai true
    const checkState = await getProjectSurvey(testProjectId);
    expect(checkState.isLocked).toBe(true);

    // Percobaan ubah survei harus ditolak 409 FIELD_INPUT_LOCKED
    await expect(
      upsertProjectSurvey(
        testProjectId,
        {
          surveyDate: '2026-10-21',
          surveyorNames: 'Hacker',
          existingCondition: 'Kondisi diubah setelah submit',
        },
        testUserId
      )
    ).rejects.toThrowError(DomainError);
  });
});
