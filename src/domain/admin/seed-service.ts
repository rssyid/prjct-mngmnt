import fs from 'node:fs';
import path from 'node:path';
import { prisma as defaultPrisma, PrismaClient, Ops } from '@/infra/db';
import { hashPassword } from 'better-auth/crypto';

interface LokasiData {
  regions: Array<{ code: string; name: string; ops: string; order: number }>;
  wilayah: Array<{ regionCode: string; name: string; order: number }>;
  companies: Array<{ code: string; name: string; alias?: string; order: number }>;
  estates: Array<{
    companyCode: string;
    code: string;
    name: string;
    wilayahName: string;
    regionCode: string;
    estateNew?: string;
    legacyCode?: string;
    order: number;
  }>;
}

interface MasterData {
  units: Array<{ code: string; name: string }>;
  projectCategories: Array<{ code: string; name: string; order: number }>;
  materials: Array<{ name: string; defaultUnitCode: string }>;
  heavyEquipmentTypes: Array<{ name: string }>;
  approvalPositions: Array<{ code: string; name: string; rank: number }>;
  systemSetting?: {
    id: number;
    workingWeekdays: number[];
    ewsYellowFrom: string;
    ewsRedAbove: string;
  };
}

export async function runSeed(client: PrismaClient = defaultPrisma) {
  const rootDir = process.cwd();
  const lokasiPath = path.join(rootDir, 'prisma/seed-data/lokasi.json');
  const masterPath = path.join(rootDir, 'prisma/seed-data/master.json');

  const lokasiJson: LokasiData = JSON.parse(fs.readFileSync(lokasiPath, 'utf-8'));
  const masterJson: MasterData = JSON.parse(fs.readFileSync(masterPath, 'utf-8'));

  // 1. Seed Regions (8)
  for (const r of lokasiJson.regions) {
    await client.region.upsert({
      where: { code: r.code },
      update: {
        name: r.name,
        ops: r.ops as Ops,
        order: r.order,
        isActive: true,
      },
      create: {
        code: r.code,
        name: r.name,
        ops: r.ops as Ops,
        order: r.order,
        isActive: true,
      },
    });
  }

  // Ambil map region code -> id
  const allRegions = await client.region.findMany();
  const regionMap = new Map(allRegions.map((r) => [r.code, r.id]));

  // 2. Seed Wilayah (18)
  for (const w of lokasiJson.wilayah) {
    const regionId = regionMap.get(w.regionCode);
    if (!regionId) continue;

    const existing = await client.wilayah.findFirst({
      where: { regionId, name: w.name },
    });

    if (existing) {
      await client.wilayah.update({
        where: { id: existing.id },
        data: { order: w.order, isActive: true },
      });
    } else {
      await client.wilayah.create({
        data: {
          regionId,
          name: w.name,
          order: w.order,
          isActive: true,
        },
      });
    }
  }

  // Ambil map (regionId + wilayahName) -> wilayahId
  const allWilayah = await client.wilayah.findMany();
  const wilayahMap = new Map(allWilayah.map((w) => [`${w.regionId}:${w.name}`, w.id]));

  // 3. Seed Companies (27)
  for (const c of lokasiJson.companies) {
    await client.company.upsert({
      where: { code: c.code },
      update: {
        name: c.name,
        alias: c.alias ?? null,
        order: c.order,
        isActive: true,
      },
      create: {
        code: c.code,
        name: c.name,
        alias: c.alias ?? null,
        order: c.order,
        isActive: true,
      },
    });
  }

  // Ambil map company code -> id
  const allCompanies = await client.company.findMany();
  const companyMap = new Map(allCompanies.map((c) => [c.code, c.id]));

  // 4. Seed Estates (63)
  for (const e of lokasiJson.estates) {
    const companyId = companyMap.get(e.companyCode);
    const regionId = regionMap.get(e.regionCode);
    if (!companyId || !regionId) continue;

    const wilayahId = wilayahMap.get(`${regionId}:${e.wilayahName}`);
    if (!wilayahId) continue;

    await client.estate.upsert({
      where: {
        companyId_code: {
          companyId,
          code: e.code,
        },
      },
      update: {
        name: e.name,
        wilayahId,
        estateNew: e.estateNew ?? null,
        legacyCode: e.legacyCode ?? null,
        order: e.order,
        isActive: true,
      },
      create: {
        companyId,
        code: e.code,
        name: e.name,
        wilayahId,
        estateNew: e.estateNew ?? null,
        legacyCode: e.legacyCode ?? null,
        order: e.order,
        isActive: true,
      },
    });
  }

  // 5. Seed Units
  for (const u of masterJson.units) {
    await client.unit.upsert({
      where: { code: u.code },
      update: { name: u.name, isActive: true },
      create: { code: u.code, name: u.name, isActive: true },
    });
  }

  const allUnits = await client.unit.findMany();
  const unitMap = new Map(allUnits.map((u) => [u.code, u.id]));

  // 6. Seed Project Categories
  for (const cat of masterJson.projectCategories) {
    await client.projectCategory.upsert({
      where: { code: cat.code },
      update: { name: cat.name, order: cat.order, isActive: true },
      create: { code: cat.code, name: cat.name, order: cat.order, isActive: true },
    });
  }

  // 7. Seed Materials
  for (const m of masterJson.materials) {
    const defaultUnitId = unitMap.get(m.defaultUnitCode);
    if (!defaultUnitId) continue;

    const existing = await client.material.findFirst({
      where: { name: m.name },
    });

    if (existing) {
      await client.material.update({
        where: { id: existing.id },
        data: { defaultUnitId, isActive: true },
      });
    } else {
      await client.material.create({
        data: {
          name: m.name,
          defaultUnitId,
          isComplete: false,
          isActive: true,
        },
      });
    }
  }

  // 8. Seed Heavy Equipment Types
  for (const eq of masterJson.heavyEquipmentTypes) {
    await client.heavyEquipmentType.upsert({
      where: { name: eq.name },
      update: { isActive: true },
      create: { name: eq.name, isActive: true },
    });
  }

  // 9. Seed Approval Positions
  for (const pos of masterJson.approvalPositions) {
    await client.approvalPosition.upsert({
      where: { code: pos.code },
      update: { name: pos.name, rank: pos.rank, isActive: true },
      create: { code: pos.code, name: pos.name, rank: pos.rank, isActive: true },
    });
  }

  // 10. Seed System Setting
  const setting = masterJson.systemSetting || {
    id: 1,
    workingWeekdays: [1, 2, 3, 4, 5, 6],
    ewsYellowFrom: '5.00',
    ewsRedAbove: '10.00',
  };

  await client.systemSetting.upsert({
    where: { id: 1 },
    update: {
      workingWeekdays: setting.workingWeekdays,
      ewsYellowFrom: setting.ewsYellowFrom,
      ewsRedAbove: setting.ewsRedAbove,
    },
    create: {
      id: 1,
      workingWeekdays: setting.workingWeekdays,
      ewsYellowFrom: setting.ewsYellowFrom,
      ewsRedAbove: setting.ewsRedAbove,
    },
  });

  // 11. Seed First Super Admin
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@wm.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'AdminWM2026!';
  const hashedPassword = await hashPassword(adminPassword);

  let adminUser = await client.user.findUnique({
    where: { email: adminEmail },
  });

  if (!adminUser) {
    adminUser = await client.user.create({
      data: {
        id: 'super_admin_initial',
        name: 'Super Admin Initial',
        email: adminEmail,
        role: 'SUPER_ADMIN',
        isActive: true,
        mustChangePassword: true,
      },
    });
  } else {
    await client.user.update({
      where: { id: adminUser.id },
      data: {
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    });
  }

  // Pastikan akun kredensial tersedia
  const existingAcc = await client.account.findFirst({
    where: {
      userId: adminUser.id,
      providerId: 'credential',
    },
  });

  if (!existingAcc) {
    await client.account.create({
      data: {
        id: `acc_${adminUser.id}`,
        userId: adminUser.id,
        providerId: 'credential',
        accountId: adminUser.id,
        password: hashedPassword,
      },
    });
  } else {
    await client.account.update({
      where: { id: existingAcc.id },
      data: {
        accountId: adminUser.id,
        password: hashedPassword,
      },
    });
  }

  return {
    regionsCount: await client.region.count(),
    wilayahCount: await client.wilayah.count(),
    companiesCount: await client.company.count(),
    estatesCount: await client.estate.count(),
  };
}
