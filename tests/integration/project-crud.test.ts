import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma, Prisma } from '@/infra/db';
import {
  createProject,
  updateProject,
  updateProjectEstates,
  queryProjects,
  getProjectDetail,
} from '@/domain/project/project-service';
import { DomainError } from '@/shared/errors';

describe('Project CRUD, Multi-Estate Validation & Multi-Region Filters (AC-11, AC-13)', () => {
  const timestamp = Date.now();
  const testUserId = `user_crud_${timestamp}`;
  let companyAId = '';
  let companyBId = '';
  let categoryId = '';
  let region1Id = '';
  let region2Id = '';
  let wilayah1Id = '';
  let wilayah2Id = '';
  let estateA1Id = ''; // Company A, Wilayah 1
  let estateA2Id = ''; // Company A, Wilayah 2
  let estateBId = '';  // Company B, Wilayah 1
  let blockA1Id = '';  // Estate A1
  let blockOtherId = ''; // Estate B

  beforeAll(async () => {
    // 1. User
    await prisma.user.create({
      data: {
        id: testUserId,
        name: 'Project CRUD Test User',
        email: `crud_${timestamp}@example.com`,
        role: 'SUPER_ADMIN',
      },
    });

    // 2. Companies
    const cA = await prisma.company.create({
      data: {
        code: `CA_${timestamp.toString().slice(-4)}`,
        name: `PT Company A ${timestamp}`,
      },
    });
    companyAId = cA.id;

    const cB = await prisma.company.create({
      data: {
        code: `CB_${timestamp.toString().slice(-4)}`,
        name: `PT Company B ${timestamp}`,
      },
    });
    companyBId = cB.id;

    // 3. Category
    const cat = await prisma.projectCategory.create({
      data: {
        code: `CAT_${timestamp.toString().slice(-4)}`,
        name: `Category CRUD ${timestamp}`,
      },
    });
    categoryId = cat.id;

    // 4. Regions
    const r1 = await prisma.region.create({
      data: { code: `R1_${timestamp}`, name: `Region 1 ${timestamp}`, ops: 'SUMATERA' },
    });
    region1Id = r1.id;

    const r2 = await prisma.region.create({
      data: { code: `R2_${timestamp}`, name: `Region 2 ${timestamp}`, ops: 'KALBAR' },
    });
    region2Id = r2.id;

    // 5. Wilayahs
    const w1 = await prisma.wilayah.create({
      data: { regionId: region1Id, name: `Wilayah 1 ${timestamp}` },
    });
    wilayah1Id = w1.id;

    const w2 = await prisma.wilayah.create({
      data: { regionId: region2Id, name: `Wilayah 2 ${timestamp}` },
    });
    wilayah2Id = w2.id;

    // 6. Estates
    const eA1 = await prisma.estate.create({
      data: {
        companyId: companyAId,
        wilayahId: wilayah1Id,
        code: `EA1_${timestamp.toString().slice(-4)}`,
        name: 'Estate A1',
      },
    });
    estateA1Id = eA1.id;

    const eA2 = await prisma.estate.create({
      data: {
        companyId: companyAId,
        wilayahId: wilayah2Id,
        code: `EA2_${timestamp.toString().slice(-4)}`,
        name: 'Estate A2',
      },
    });
    estateA2Id = eA2.id;

    const eB = await prisma.estate.create({
      data: {
        companyId: companyBId,
        wilayahId: wilayah1Id,
        code: `EB_${timestamp.toString().slice(-4)}`,
        name: 'Estate B',
      },
    });
    estateBId = eB.id;

    // 7. Blocks
    const bA1 = await prisma.block.create({
      data: { estateId: estateA1Id, blockCode: 'A01', name: 'Blok A01' },
    });
    blockA1Id = bA1.id;

    const bO = await prisma.block.create({
      data: { estateId: estateBId, blockCode: 'B01', name: 'Blok B01' },
    });
    blockOtherId = bO.id;
  });

  afterAll(async () => {
    await prisma.user.update({
      where: { id: testUserId },
      data: { isActive: false },
    }).catch(() => {});
  });

  it('AC-11 menolak pembuatan proyek jika Estate bukan milik Company proyek atau Block bukan milik Estate', async () => {
    // 1. Estate B (milik Company B) dipasangkan ke Proyek Company A
    await expect(
      createProject(
        {
          name: 'Proyek Lintas PT Ilegal',
          companyId: companyAId,
          categoryId,
          picUserId: testUserId,
          estates: [
            { estateId: estateA1Id, isPrimary: true },
            { estateId: estateBId, isPrimary: false },
          ],
        },
        testUserId
      )
    ).rejects.toThrowError(/bukan milik Company proyek/);

    // 2. Block milik Estate B dipasangkan ke Estate A1
    await expect(
      createProject(
        {
          name: 'Proyek Block Ilegal',
          companyId: companyAId,
          categoryId,
          picUserId: testUserId,
          estates: [
            { estateId: estateA1Id, isPrimary: true, blockId: blockOtherId },
          ],
        },
        testUserId
      )
    ).rejects.toThrowError(/bukan milik Estate yang dipilih/);

    // 3. Tanpa Estate utama (tidak ada yang isPrimary: true)
    await expect(
      createProject(
        {
          name: 'Proyek Tanpa Primary',
          companyId: companyAId,
          categoryId,
          picUserId: testUserId,
          estates: [
            { estateId: estateA1Id, isPrimary: false },
            { estateId: estateA2Id, isPrimary: false },
          ],
        },
        testUserId
      )
    ).rejects.toThrowError(/tepat satu Estate utama/);

    // 4. Lebih dari satu Estate utama (dua isPrimary: true)
    await expect(
      createProject(
        {
          name: 'Proyek Multi Primary',
          companyId: companyAId,
          categoryId,
          picUserId: testUserId,
          estates: [
            { estateId: estateA1Id, isPrimary: true },
            { estateId: estateA2Id, isPrimary: true },
          ],
        },
        testUserId
      )
    ).rejects.toThrowError(/tepat satu Estate utama/);
  });

  it('AC-11 berhasil membuat proyek multi-Estate yang sah dengan tepat satu Estate utama', async () => {
    const project = await createProject(
      {
        name: `Proyek Sah Multi-Estate ${timestamp}`,
        companyId: companyAId,
        categoryId,
        picUserId: testUserId,
        targetStartDate: '2026-11-01',
        targetEndDate: '2026-12-01',
        plannedBudget: 2000000000,
        estates: [
          { estateId: estateA1Id, isPrimary: true, blockId: blockA1Id },
          { estateId: estateA2Id, isPrimary: false },
        ],
      },
      testUserId
    );

    expect(project).toBeDefined();
    expect(project.status).toBe('DRAFT');
    expect(project.estates.length).toBe(2);

    const primaryEstate = project.estates.find((e) => e.isPrimary);
    expect(primaryEstate?.estateId).toBe(estateA1Id);
    expect(primaryEstate?.blockId).toBe(blockA1Id);

    // Verifikasi get detail
    const detail = await getProjectDetail(project.id);
    expect(detail.id).toBe(project.id);
    expect(detail.company.id).toBe(companyAId);
  });

  it('AC-13 proyek multi-Estate muncul di filter tiap Region dan Wilayah Estate-nya', async () => {
    // Buat proyek multi-Estate mencakup Wilayah 1 (Region 1) dan Wilayah 2 (Region 2)
    const project = await createProject(
      {
        name: `Proyek Lintas Wilayah ${timestamp}`,
        companyId: companyAId,
        categoryId,
        picUserId: testUserId,
        estates: [
          { estateId: estateA1Id, isPrimary: true },
          { estateId: estateA2Id, isPrimary: false },
        ],
      },
      testUserId
    );

    // 1. Filter Region 1
    const resRegion1 = await queryProjects({
      regionIds: [region1Id],
    });
    const foundInR1 = resRegion1.items.some((p) => p.id === project.id);
    expect(foundInR1).toBe(true);

    // 2. Filter Region 2
    const resRegion2 = await queryProjects({
      regionIds: [region2Id],
    });
    const foundInR2 = resRegion2.items.some((p) => p.id === project.id);
    expect(foundInR2).toBe(true);

    // 3. Filter Wilayah 1
    const resWilayah1 = await queryProjects({
      wilayahIds: [wilayah1Id],
    });
    const foundInW1 = resWilayah1.items.some((p) => p.id === project.id);
    expect(foundInW1).toBe(true);

    // 4. Filter Wilayah 2
    const resWilayah2 = await queryProjects({
      wilayahIds: [wilayah2Id],
    });
    const foundInW2 = resWilayah2.items.some((p) => p.id === project.id);
    expect(foundInW2).toBe(true);

    // 5. Filter Company A
    const resCompanyA = await queryProjects({
      companyIds: [companyAId],
    });
    expect(resCompanyA.items.some((p) => p.id === project.id)).toBe(true);

    // 6. Filter Company B (harus tidak muncul)
    const resCompanyB = await queryProjects({
      companyIds: [companyBId],
    });
    expect(resCompanyB.items.some((p) => p.id === project.id)).toBe(false);
  });

  it('updateProjectEstates berhasil diubah saat DRAFT dan ditolak bila status sudah PROCUREMENT', async () => {
    const project = await createProject(
      {
        name: `Proyek Update Estate ${timestamp}`,
        companyId: companyAId,
        categoryId,
        picUserId: testUserId,
        estates: [{ estateId: estateA1Id, isPrimary: true }],
      },
      testUserId
    );

    // Ubah estates
    const updated = await updateProjectEstates(
      project.id,
      [
        { estateId: estateA1Id, isPrimary: false },
        { estateId: estateA2Id, isPrimary: true },
      ],
      testUserId
    );
    expect(updated.estates.length).toBe(2);
    expect(updated.estates.find((e) => e.isPrimary)?.estateId).toBe(estateA2Id);

    // Simulasikan status PROCUREMENT
    await prisma.project.update({
      where: { id: project.id },
      data: { status: 'PROCUREMENT' },
    });

    await expect(
      updateProjectEstates(
        project.id,
        [{ estateId: estateA1Id, isPrimary: true }],
        testUserId
      )
    ).rejects.toThrowError(/terkunci setelah tahap pengadaan/);
  });
});
