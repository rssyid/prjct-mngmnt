import { prisma } from '../src/infra/db';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

async function cleanup() {
  const masterJson = JSON.parse(readFileSync(join(process.cwd(), 'prisma/seed-data/master.json'), 'utf-8'));

  const seedRegCodes = masterJson.regions.map((r: { code: string }) => r.code);
  const seedWilNames = masterJson.wilayah.map((w: { name: string }) => w.name);
  const seedCompCodes = masterJson.companies.map((c: { code: string }) => c.code);
  const seedEstCodes = masterJson.estates.map((e: { code: string }) => e.code);

  console.log('--- Checking Stray Test Data ---');

  // 1. Delete test projects and relations first
  const strayEstates = await prisma.estate.findMany({
    where: { NOT: { code: { in: seedEstCodes } } },
    select: { id: true, code: true },
  });
  console.log(`Found ${strayEstates.length} stray estates`);

  if (strayEstates.length > 0) {
    const estateIds = strayEstates.map((e) => e.id);
    await prisma.projectEstate.deleteMany({
      where: { estateId: { in: estateIds } },
    });
    await prisma.block.deleteMany({
      where: { estateId: { in: estateIds } },
    });
    await prisma.estate.deleteMany({
      where: { id: { in: estateIds } },
    });
  }

  // 2. Delete test companies
  const strayComps = await prisma.company.findMany({
    where: { NOT: { code: { in: seedCompCodes } } },
    select: { id: true, code: true },
  });
  console.log(`Found ${strayComps.length} stray companies`);
  if (strayComps.length > 0) {
    const compIds = strayComps.map((c) => c.id);
    const projects = await prisma.project.findMany({
      where: { companyId: { in: compIds } },
      select: { id: true },
    });
    const projectIds = projects.map((p) => p.id);
    if (projectIds.length > 0) {
      await prisma.projectEstate.deleteMany({
        where: { projectId: { in: projectIds } },
      });
      await prisma.project.deleteMany({
        where: { id: { in: projectIds } },
      });
    }
    await prisma.projectCodeCounter.deleteMany({
      where: { companyId: { in: compIds } },
    });
    await prisma.company.deleteMany({
      where: { id: { in: compIds } },
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
