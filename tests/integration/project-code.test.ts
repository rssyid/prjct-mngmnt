import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma, Prisma } from '@/infra/db';
import { createProject } from '@/domain/project/project-service';

describe('Atomic Project Code Generation Concurrency (AC-10)', () => {
  const timestamp = Date.now();
  const testUserId = `user_code_${timestamp}`;
  let testCompanyCode = '';
  let testCompanyId = '';
  let testCategoryId = '';
  let testEstateId = '';

  beforeAll(async () => {
    // 1. User
    await prisma.user.create({
      data: {
        id: testUserId,
        name: 'Code Test User',
        email: `code_${timestamp}@example.com`,
        role: 'SUPER_ADMIN',
      },
    });

    // 2. Gunakan Company, Category, dan Estate yang sudah di-seed
    const comp = await prisma.company.findFirstOrThrow();
    testCompanyId = comp.id;
    testCompanyCode = comp.code;

    const cat = await prisma.projectCategory.findFirstOrThrow();
    testCategoryId = cat.id;

    const est = await prisma.estate.findFirstOrThrow({
      where: { companyId: testCompanyId },
    });
    testEstateId = est.id;
  });

  afterAll(async () => {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL app.allow_purge = 'on'");
      const projects = await tx.project.findMany({
        where: { name: { contains: timestamp.toString() } },
        select: { id: true },
      });
      const pIds = projects.map((p) => p.id);
      if (pIds.length > 0) {
        await tx.projectStatusHistory.deleteMany({ where: { projectId: { in: pIds } } });
        await tx.projectEstate.deleteMany({ where: { projectId: { in: pIds } } });
        await tx.project.deleteMany({ where: { id: { in: pIds } } });
      }
    });

    await prisma.user.update({
      where: { id: testUserId },
      data: { isActive: false },
    }).catch(() => {});
  });

  it('AC-10 kode WM-{Company}-{YYYY}-{SEQ4} berurutan dan pembuatan bersamaan tidak menghasilkan nomor sama', async () => {
    const parallelCount = 8;
    const currentYear = new Date().getFullYear();

    // Jalankan 8 pembuatan proyek secara simultan/paralel
    const creationPromises = Array.from({ length: parallelCount }, (_, i) =>
      createProject(
        {
          name: `Proyek Paralel ${i + 1} - ${timestamp}`,
          companyId: testCompanyId,
          categoryId: testCategoryId,
          picUserId: testUserId,
          targetStartDate: '2026-11-01',
          targetEndDate: '2026-12-01',
          plannedBudget: 1000000000,
          estates: [
            {
              estateId: testEstateId,
              isPrimary: true,
            },
          ],
        },
        testUserId
      )
    );

    const createdProjects = await Promise.all(creationPromises);
    expect(createdProjects.length).toBe(parallelCount);

    const codes = createdProjects.map((p) => p.code);
    // 1. Semua kode unik (tidak ada duplikat)
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(parallelCount);

    // 2. Format kode sesuai: WM-{Company.code}-{YYYY}-{SEQ4}
    const expectedPrefix = `WM-${testCompanyCode}-${currentYear}-`;
    for (const code of codes) {
      expect(code.startsWith(expectedPrefix)).toBe(true);
      expect(code).toMatch(new RegExp(`^WM-${testCompanyCode}-${currentYear}-\\d{4}$`));
    }

    // 3. Nomor urut berurutan tepat 0001 sampai 0008
    const sequences = codes
      .map((c) => parseInt(c.slice(-4), 10))
      .sort((a, b) => a - b);

    expect(sequences).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
