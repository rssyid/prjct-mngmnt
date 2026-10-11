import { prisma } from '../src/infra/db';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

async function cleanup() {
  const lokasiJson = JSON.parse(readFileSync(join(process.cwd(), 'prisma/seed-data/lokasi.json'), 'utf-8'));

  const seedRegCodes = lokasiJson.regions.map((r: { code: string }) => r.code);
  const seedWilNames = lokasiJson.wilayah.map((w: { name: string }) => w.name);
  const seedCompCodes = lokasiJson.companies.map((c: { code: string }) => c.code);
  const seedEstCodes = lokasiJson.estates.map((e: { code: string }) => e.code);

  console.log('--- Checking Stray Test Data ---');

  const strayEstates = await prisma.estate.findMany({
    where: { NOT: { code: { in: seedEstCodes } } },
    select: { id: true, code: true },
  });
  console.log(`Found ${strayEstates.length} stray estates`);

  const strayComps = await prisma.company.findMany({
    where: { NOT: { code: { in: seedCompCodes } } },
    select: { id: true, code: true },
  });
  console.log(`Found ${strayComps.length} stray companies`);

  const compIds = strayComps.map((c) => c.id);
  const estateIds = strayEstates.map((e) => e.id);

  if (compIds.length > 0 || estateIds.length > 0) {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL app.allow_purge = 'on'");

      // Find all projects under stray companies or stray estates
      const strayProjects = await tx.project.findMany({
        where: {
          OR: [
            { companyId: { in: compIds } },
            { estates: { some: { estateId: { in: estateIds } } } },
          ],
        },
        select: { id: true },
      });
      const projIds = strayProjects.map((p) => p.id);
      console.log(`Found ${projIds.length} stray projects`);

      if (projIds.length > 0) {
        await tx.approvalRecord.deleteMany({
          where: {
            levelSnapshot: {
              afceAttempt: { projectId: { in: projIds } },
            },
          },
        });
        await tx.approvalLevelSnapshot.deleteMany({
          where: {
            afceAttempt: { projectId: { in: projIds } },
          },
        });
        await tx.boqItem.deleteMany({
          where: {
            afceAttempt: { projectId: { in: projIds } },
          },
        });
        await tx.afceAttempt.deleteMany({
          where: { projectId: { in: projIds } },
        });
        await tx.survey.deleteMany({
          where: { projectId: { in: projIds } },
        });
        await tx.budgetEntry.deleteMany({
          where: { projectId: { in: projIds } },
        });
        await tx.projectStatusHistory.deleteMany({
          where: { projectId: { in: projIds } },
        });
        await tx.projectEstate.deleteMany({
          where: { projectId: { in: projIds } },
        });
        await tx.project.deleteMany({
          where: { id: { in: projIds } },
        });
      }

      if (estateIds.length > 0) {
        await tx.projectEstate.deleteMany({
          where: { estateId: { in: estateIds } },
        });
        await tx.block.deleteMany({
          where: { estateId: { in: estateIds } },
        });
        await tx.estate.deleteMany({
          where: { id: { in: estateIds } },
        });
      }

      if (compIds.length > 0) {
        await tx.projectCodeCounter.deleteMany({
          where: { companyId: { in: compIds } },
        });
        await tx.company.deleteMany({
          where: { id: { in: compIds } },
        });
      }
    });
  }

  // 3. Delete stray wilayah
  const strayWil = await prisma.wilayah.findMany({
    where: { NOT: { name: { in: seedWilNames } } },
    select: { id: true, name: true },
  });
  console.log(`Found ${strayWil.length} stray wilayah`);
  if (strayWil.length > 0) {
    await prisma.wilayah.deleteMany({
      where: { id: { in: strayWil.map((w) => w.id) } },
    });
  }

  // 4. Delete stray regions
  const strayRegs = await prisma.region.findMany({
    where: { NOT: { code: { in: seedRegCodes } } },
    select: { id: true, code: true },
  });
  console.log(`Found ${strayRegs.length} stray regions`);
  if (strayRegs.length > 0) {
    await prisma.region.deleteMany({
      where: { id: { in: strayRegs.map((r) => r.id) } },
    });
  }

  // 5. Delete test categories (CAT_*)
  await prisma.projectCategory.deleteMany({
    where: { code: { startsWith: 'CAT_' } },
  });

  // 6. Delete test users
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { startsWith: 'code_' } },
        { email: { startsWith: 'trans_' } },
        { email: { startsWith: 'crud_' } },
      ],
    },
  });

  const [regions, wilayah, companies, estates] = await Promise.all([
    prisma.region.count(),
    prisma.wilayah.count(),
    prisma.company.count(),
    prisma.estate.count(),
  ]);

  console.log('FINAL COUNTS:');
  console.log('Regions:', regions, '(expected: 8)');
  console.log('Wilayah:', wilayah, '(expected: 18)');
  console.log('Companies:', companies, '(expected: 27)');
  console.log('Estates:', estates, '(expected: 63)');
}

cleanup()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
