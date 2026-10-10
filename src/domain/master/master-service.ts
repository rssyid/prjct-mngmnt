import { prisma, Prisma } from '@/infra/db';
import { DomainError } from '@/shared/errors';
import { recordAuditLog } from '@/domain/audit/audit-service';
import {
  regionSchema,
  wilayahSchema,
  companySchema,
  estateSchema,
  blockSchema,
  vendorSchema,
  quickVendorSchema,
  unitSchema,
  projectCategorySchema,
  materialSchema,
  quickMaterialSchema,
  heavyEquipmentTypeSchema,
  approvalPositionSchema,
} from '@/shared/schemas/master';

export type MasterType =
  | 'regions'
  | 'wilayah'
  | 'companies'
  | 'estates'
  | 'blocks'
  | 'vendors'
  | 'units'
  | 'project-categories'
  | 'materials'
  | 'heavy-equipment-types'
  | 'approval-positions';

export interface MasterQueryParams {
  active?: string | null;
  q?: string | null;
  regionId?: string | null;
  companyId?: string | null;
  wilayahId?: string | null;
  estateId?: string | null;
}

export function computeVendorIsComplete(vendor: {
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  contactName?: string | null;
  npwp?: string | null;
}): boolean {
  return Boolean(
    vendor.address?.trim() &&
      vendor.phone?.trim() &&
      vendor.email?.trim() &&
      vendor.contactName?.trim() &&
      vendor.npwp?.trim()
  );
}

export async function listMaster(type: MasterType, params: MasterQueryParams) {
  const isActive =
    params.active === 'true' ? true : params.active === 'false' ? false : undefined;
  const q = params.q?.trim();

  switch (type) {
    case 'regions': {
      const where: Prisma.RegionWhereInput = {};
      if (isActive !== undefined) where.isActive = isActive;
      if (q) {
        where.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { code: { contains: q, mode: 'insensitive' } },
        ];
      }
      return prisma.region.findMany({ where, orderBy: { order: 'asc' } });
    }
    case 'wilayah': {
      const where: Prisma.WilayahWhereInput = {};
      if (isActive !== undefined) where.isActive = isActive;
      if (params.regionId) where.regionId = params.regionId;
      if (q) where.name = { contains: q, mode: 'insensitive' };
      return prisma.wilayah.findMany({
        where,
        orderBy: { order: 'asc' },
        include: { region: true },
      });
    }
    case 'companies': {
      const where: Prisma.CompanyWhereInput = {};
      if (isActive !== undefined) where.isActive = isActive;
      if (q) {
        where.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { code: { contains: q, mode: 'insensitive' } },
        ];
      }
      return prisma.company.findMany({ where, orderBy: { order: 'asc' } });
    }
    case 'estates': {
      const where: Prisma.EstateWhereInput = {};
      if (isActive !== undefined) where.isActive = isActive;
      if (params.companyId) where.companyId = params.companyId;
      if (params.wilayahId) where.wilayahId = params.wilayahId;
      if (params.regionId) where.wilayah = { regionId: params.regionId };
      if (q) {
        where.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { code: { contains: q, mode: 'insensitive' } },
        ];
      }
      return prisma.estate.findMany({
        where,
        orderBy: { order: 'asc' },
        include: { company: true, wilayah: { include: { region: true } } },
      });
    }
    case 'blocks': {
      const where: Prisma.BlockWhereInput = {};
      if (isActive !== undefined) where.isActive = isActive;
      if (params.estateId) where.estateId = params.estateId;
      if (q) {
        where.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { blockCode: { contains: q, mode: 'insensitive' } },
        ];
      }
      return prisma.block.findMany({ where, orderBy: { blockCode: 'asc' } });
    }
    case 'vendors': {
      const where: Prisma.VendorWhereInput = {};
      if (isActive !== undefined) where.isActive = isActive;
      if (q) where.name = { contains: q, mode: 'insensitive' };
      return prisma.vendor.findMany({ where, orderBy: { name: 'asc' } });
    }
    case 'units': {
      const where: Prisma.UnitWhereInput = {};
      if (isActive !== undefined) where.isActive = isActive;
      if (q) {
        where.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { code: { contains: q, mode: 'insensitive' } },
        ];
      }
      return prisma.unit.findMany({ where, orderBy: { code: 'asc' } });
    }
    case 'project-categories': {
      const where: Prisma.ProjectCategoryWhereInput = {};
      if (isActive !== undefined) where.isActive = isActive;
      if (q) {
        where.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { code: { contains: q, mode: 'insensitive' } },
        ];
      }
      return prisma.projectCategory.findMany({ where, orderBy: { order: 'asc' } });
    }
    case 'materials': {
      const where: Prisma.MaterialWhereInput = {};
      if (isActive !== undefined) where.isActive = isActive;
      if (q) where.name = { contains: q, mode: 'insensitive' };
      return prisma.material.findMany({
        where,
        orderBy: { name: 'asc' },
        include: { defaultUnit: true },
      });
    }
    case 'heavy-equipment-types': {
      const where: Prisma.HeavyEquipmentTypeWhereInput = {};
      if (isActive !== undefined) where.isActive = isActive;
      if (q) where.name = { contains: q, mode: 'insensitive' };
      return prisma.heavyEquipmentType.findMany({ where, orderBy: { name: 'asc' } });
    }
    case 'approval-positions': {
      const where: Prisma.ApprovalPositionWhereInput = {};
      if (isActive !== undefined) where.isActive = isActive;
      if (q) {
        where.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { code: { contains: q, mode: 'insensitive' } },
        ];
      }
      return prisma.approvalPosition.findMany({ where, orderBy: { rank: 'asc' } });
    }
    default:
      throw new DomainError('NOT_FOUND', `Tipe master ${type} tidak ditemukan`);
  }
}

export async function createMaster(
  type: MasterType,
  actorId: string,
  rawPayload: unknown
) {
  return prisma.$transaction(async (tx) => {
    let created: Record<string, unknown>;

    switch (type) {
      case 'regions': {
        const payload = regionSchema.parse(rawPayload);
        created = (await tx.region.create({ data: payload })) as unknown as Record<string, unknown>;
        break;
      }
      case 'wilayah': {
        const payload = wilayahSchema.parse(rawPayload);
        created = (await tx.wilayah.create({ data: payload })) as unknown as Record<string, unknown>;
        break;
      }
      case 'companies': {
        const payload = companySchema.parse(rawPayload);
        created = (await tx.company.create({ data: payload })) as unknown as Record<string, unknown>;
        break;
      }
      case 'estates': {
        const payload = estateSchema.parse(rawPayload);
        created = (await tx.estate.create({ data: payload })) as unknown as Record<string, unknown>;
        break;
      }
      case 'blocks': {
        const payload = blockSchema.parse(rawPayload);
        created = (await tx.block.create({
          data: {
            ...payload,
            areaHectares: payload.areaHectares ? new Prisma.Decimal(payload.areaHectares) : null,
          },
        })) as unknown as Record<string, unknown>;
        break;
      }
      case 'vendors': {
        const payload = vendorSchema.parse(rawPayload);
        const isComplete = computeVendorIsComplete(payload);
        created = (await tx.vendor.create({
          data: { ...payload, isComplete },
        })) as unknown as Record<string, unknown>;
        break;
      }
      case 'units': {
        const payload = unitSchema.parse(rawPayload);
        created = (await tx.unit.create({ data: payload })) as unknown as Record<string, unknown>;
        break;
      }
      case 'project-categories': {
        const payload = projectCategorySchema.parse(rawPayload);
        created = (await tx.projectCategory.create({ data: payload })) as unknown as Record<string, unknown>;
        break;
      }
      case 'materials': {
        const payload = materialSchema.parse(rawPayload);
        created = (await tx.material.create({ data: payload })) as unknown as Record<string, unknown>;
        break;
      }
      case 'heavy-equipment-types': {
        const payload = heavyEquipmentTypeSchema.parse(rawPayload);
        created = (await tx.heavyEquipmentType.create({ data: payload })) as unknown as Record<string, unknown>;
        break;
      }
      case 'approval-positions': {
        const payload = approvalPositionSchema.parse(rawPayload);
        created = (await tx.approvalPosition.create({ data: payload })) as unknown as Record<string, unknown>;
        break;
      }
      default:
        throw new DomainError('NOT_FOUND', `Tipe master ${type} tidak ditemukan`);
    }

    await recordAuditLog(tx, {
      actorId,
      entityType: `Master_${type}`,
      entityId: String(created.id),
      action: 'CREATE',
      before: null,
      after: created,
    });

    return created;
  });
}

export async function createQuickVendor(actorId: string, rawPayload: unknown) {
  const payload = quickVendorSchema.parse(rawPayload);
  return prisma.$transaction(async (tx) => {
    const created = await tx.vendor.create({
      data: {
        name: payload.name,
        type: 'EKSTERNAL',
        isComplete: false,
      },
    });

    await recordAuditLog(tx, {
      actorId,
      entityType: 'Master_vendors',
      entityId: created.id,
      action: 'CREATE_QUICK',
      before: null,
      after: created as unknown as Record<string, unknown>,
    });

    return created;
  });
}

export async function createQuickMaterial(actorId: string, rawPayload: unknown) {
  const payload = quickMaterialSchema.parse(rawPayload);
  return prisma.$transaction(async (tx) => {
    const created = await tx.material.create({
      data: {
        name: payload.name,
        defaultUnitId: payload.defaultUnitId,
        isComplete: false,
      },
    });

    await recordAuditLog(tx, {
      actorId,
      entityType: 'Master_materials',
      entityId: created.id,
      action: 'CREATE_QUICK',
      before: null,
      after: created as unknown as Record<string, unknown>,
    });

    return created;
  });
}

export async function updateMaster(
  type: MasterType,
  id: string,
  actorId: string,
  rawPayload: Record<string, unknown>
) {
  return prisma.$transaction(async (tx) => {
    let before: Record<string, unknown> | null = null;
    let after: Record<string, unknown> | null = null;

    switch (type) {
      case 'regions': {
        before = (await tx.region.findUnique({ where: { id } })) as unknown as Record<string, unknown>;
        if (!before) throw new DomainError('NOT_FOUND', 'Region tidak ditemukan');
        after = (await tx.region.update({
          where: { id },
          data: regionSchema.partial().parse(rawPayload),
        })) as unknown as Record<string, unknown>;
        break;
      }
      case 'wilayah': {
        before = (await tx.wilayah.findUnique({ where: { id } })) as unknown as Record<string, unknown>;
        if (!before) throw new DomainError('NOT_FOUND', 'Wilayah tidak ditemukan');
        after = (await tx.wilayah.update({
          where: { id },
          data: wilayahSchema.partial().parse(rawPayload),
        })) as unknown as Record<string, unknown>;
        break;
      }
      case 'companies': {
        before = (await tx.company.findUnique({ where: { id } })) as unknown as Record<string, unknown>;
        if (!before) throw new DomainError('NOT_FOUND', 'Company tidak ditemukan');
        after = (await tx.company.update({
          where: { id },
          data: companySchema.partial().parse(rawPayload),
        })) as unknown as Record<string, unknown>;
        break;
      }
      case 'estates': {
        before = (await tx.estate.findUnique({ where: { id } })) as unknown as Record<string, unknown>;
        if (!before) throw new DomainError('NOT_FOUND', 'Estate tidak ditemukan');
        after = (await tx.estate.update({
          where: { id },
          data: estateSchema.partial().parse(rawPayload),
        })) as unknown as Record<string, unknown>;
        break;
      }
      case 'blocks': {
        before = (await tx.block.findUnique({ where: { id } })) as unknown as Record<string, unknown>;
        if (!before) throw new DomainError('NOT_FOUND', 'Block tidak ditemukan');
        const parsed = blockSchema.partial().parse(rawPayload);
        after = (await tx.block.update({
          where: { id },
          data: {
            ...parsed,
            areaHectares: parsed.areaHectares ? new Prisma.Decimal(parsed.areaHectares) : undefined,
          },
        })) as unknown as Record<string, unknown>;
        break;
      }
      case 'vendors': {
        before = (await tx.vendor.findUnique({ where: { id } })) as unknown as Record<string, unknown>;
        if (!before) throw new DomainError('NOT_FOUND', 'Vendor tidak ditemukan');
        const parsed = vendorSchema.partial().parse(rawPayload);

        // Optimistic locking untuk Vendor
        if (parsed.version !== undefined && (before.version as number) !== parsed.version) {
          throw new DomainError('VERSION_CONFLICT', 'Data vendor sudah diubah oleh pengguna lain');
        }

        const merged = { ...before, ...parsed };
        const isComplete = computeVendorIsComplete(merged);

        after = (await tx.vendor.update({
          where: { id },
          data: {
            ...parsed,
            isComplete,
            version: { increment: 1 },
          },
        })) as unknown as Record<string, unknown>;
        break;
      }
      case 'units': {
        before = (await tx.unit.findUnique({ where: { id } })) as unknown as Record<string, unknown>;
        if (!before) throw new DomainError('NOT_FOUND', 'Unit tidak ditemukan');
        after = (await tx.unit.update({
          where: { id },
          data: unitSchema.partial().parse(rawPayload),
        })) as unknown as Record<string, unknown>;
        break;
      }
      case 'project-categories': {
        before = (await tx.projectCategory.findUnique({ where: { id } })) as unknown as Record<string, unknown>;
        if (!before) throw new DomainError('NOT_FOUND', 'Kategori proyek tidak ditemukan');
        after = (await tx.projectCategory.update({
          where: { id },
          data: projectCategorySchema.partial().parse(rawPayload),
        })) as unknown as Record<string, unknown>;
        break;
      }
      case 'materials': {
        before = (await tx.material.findUnique({ where: { id } })) as unknown as Record<string, unknown>;
        if (!before) throw new DomainError('NOT_FOUND', 'Material tidak ditemukan');
        after = (await tx.material.update({
          where: { id },
          data: materialSchema.partial().parse(rawPayload),
        })) as unknown as Record<string, unknown>;
        break;
      }
      case 'heavy-equipment-types': {
        before = (await tx.heavyEquipmentType.findUnique({ where: { id } })) as unknown as Record<string, unknown>;
        if (!before) throw new DomainError('NOT_FOUND', 'Jenis alat berat tidak ditemukan');
        after = (await tx.heavyEquipmentType.update({
          where: { id },
          data: heavyEquipmentTypeSchema.partial().parse(rawPayload),
        })) as unknown as Record<string, unknown>;
        break;
      }
      case 'approval-positions': {
        before = (await tx.approvalPosition.findUnique({ where: { id } })) as unknown as Record<string, unknown>;
        if (!before) throw new DomainError('NOT_FOUND', 'Jabatan approver tidak ditemukan');
        after = (await tx.approvalPosition.update({
          where: { id },
          data: approvalPositionSchema.partial().parse(rawPayload),
        })) as unknown as Record<string, unknown>;
        break;
      }
      default:
        throw new DomainError('NOT_FOUND', `Tipe master ${type} tidak ditemukan`);
    }

    await recordAuditLog(tx, {
      actorId,
      entityType: `Master_${type}`,
      entityId: id,
      action: 'UPDATE',
      before,
      after,
    });

    return after;
  });
}

export async function deleteMaster(type: MasterType, id: string, actorId: string) {
  return prisma.$transaction(async (tx) => {
    // Periksa keterpakaian data (AC-60)
    let inUse = false;
    let before: Record<string, unknown> | null = null;

    switch (type) {
      case 'regions': {
        const count = await tx.wilayah.count({ where: { regionId: id } });
        if (count > 0) inUse = true;
        before = (await tx.region.findUnique({ where: { id } })) as unknown as Record<string, unknown>;
        if (!before) throw new DomainError('NOT_FOUND', 'Region tidak ditemukan');
        if (!inUse) await tx.region.delete({ where: { id } });
        break;
      }
      case 'wilayah': {
        const count = await tx.estate.count({ where: { wilayahId: id } });
        if (count > 0) inUse = true;
        before = (await tx.wilayah.findUnique({ where: { id } })) as unknown as Record<string, unknown>;
        if (!before) throw new DomainError('NOT_FOUND', 'Wilayah tidak ditemukan');
        if (!inUse) await tx.wilayah.delete({ where: { id } });
        break;
      }
      case 'companies': {
        const estateCount = await tx.estate.count({ where: { companyId: id } });
        const projectCount = await tx.project.count({ where: { companyId: id } });
        if (estateCount > 0 || projectCount > 0) inUse = true;
        before = (await tx.company.findUnique({ where: { id } })) as unknown as Record<string, unknown>;
        if (!before) throw new DomainError('NOT_FOUND', 'Company tidak ditemukan');
        if (!inUse) await tx.company.delete({ where: { id } });
        break;
      }
      case 'estates': {
        const blockCount = await tx.block.count({ where: { estateId: id } });
        const peCount = await tx.projectEstate.count({ where: { estateId: id } });
        if (blockCount > 0 || peCount > 0) inUse = true;
        before = (await tx.estate.findUnique({ where: { id } })) as unknown as Record<string, unknown>;
        if (!before) throw new DomainError('NOT_FOUND', 'Estate tidak ditemukan');
        if (!inUse) await tx.estate.delete({ where: { id } });
        break;
      }
      case 'blocks': {
        const peCount = await tx.projectEstate.count({ where: { blockId: id } });
        if (peCount > 0) inUse = true;
        before = (await tx.block.findUnique({ where: { id } })) as unknown as Record<string, unknown>;
        if (!before) throw new DomainError('NOT_FOUND', 'Block tidak ditemukan');
        if (!inUse) await tx.block.delete({ where: { id } });
        break;
      }
      case 'vendors': {
        const [tCount, sCount, wpCount, poCount, eqCount] = await Promise.all([
          tx.tenderAttempt.count({ where: { winnerVendorId: id } }),
          tx.spk.count({ where: { vendorId: id } }),
          tx.workPackage.count({ where: { vendorId: id } }),
          tx.purchaseOrder.count({ where: { vendorId: id } }),
          tx.heavyEquipmentUsage.count({ where: { vendorId: id } }),
        ]);
        if (tCount > 0 || sCount > 0 || wpCount > 0 || poCount > 0 || eqCount > 0) inUse = true;
        before = (await tx.vendor.findUnique({ where: { id } })) as unknown as Record<string, unknown>;
        if (!before) throw new DomainError('NOT_FOUND', 'Vendor tidak ditemukan');
        if (!inUse) await tx.vendor.delete({ where: { id } });
        break;
      }
      case 'units': {
        const [mCount, wiCount, wpiCount] = await Promise.all([
          tx.material.count({ where: { defaultUnitId: id } }),
          tx.workItem.count({ where: { unitId: id } }),
          tx.workPackageItem.count({ where: { unitId: id } }),
        ]);
        if (mCount > 0 || wiCount > 0 || wpiCount > 0) inUse = true;
        before = (await tx.unit.findUnique({ where: { id } })) as unknown as Record<string, unknown>;
        if (!before) throw new DomainError('NOT_FOUND', 'Unit tidak ditemukan');
        if (!inUse) await tx.unit.delete({ where: { id } });
        break;
      }
      case 'project-categories': {
        const pCount = await tx.project.count({ where: { categoryId: id } });
        if (pCount > 0) inUse = true;
        before = (await tx.projectCategory.findUnique({ where: { id } })) as unknown as Record<string, unknown>;
        if (!before) throw new DomainError('NOT_FOUND', 'Kategori proyek tidak ditemukan');
        if (!inUse) await tx.projectCategory.delete({ where: { id } });
        break;
      }
      case 'materials': {
        const wpiCount = await tx.workPackageItem.count({ where: { materialId: id } });
        if (wpiCount > 0) inUse = true;
        before = (await tx.material.findUnique({ where: { id } })) as unknown as Record<string, unknown>;
        if (!before) throw new DomainError('NOT_FOUND', 'Material tidak ditemukan');
        if (!inUse) await tx.material.delete({ where: { id } });
        break;
      }
      case 'heavy-equipment-types': {
        const eqCount = await tx.heavyEquipmentUsage.count({ where: { equipmentTypeId: id } });
        if (eqCount > 0) inUse = true;
        before = (await tx.heavyEquipmentType.findUnique({ where: { id } })) as unknown as Record<string, unknown>;
        if (!before) throw new DomainError('NOT_FOUND', 'Jenis alat berat tidak ditemukan');
        if (!inUse) await tx.heavyEquipmentType.delete({ where: { id } });
        break;
      }
      case 'approval-positions': {
        const [tlCount, snapCount] = await Promise.all([
          tx.approvalMatrixTierLevel.count({ where: { positionId: id } }),
          tx.approvalLevelSnapshot.count({ where: { positionId: id } }),
        ]);
        if (tlCount > 0 || snapCount > 0) inUse = true;
        before = (await tx.approvalPosition.findUnique({ where: { id } })) as unknown as Record<string, unknown>;
        if (!before) throw new DomainError('NOT_FOUND', 'Jabatan approver tidak ditemukan');
        if (!inUse) await tx.approvalPosition.delete({ where: { id } });
        break;
      }
      default:
        throw new DomainError('NOT_FOUND', `Tipe master ${type} tidak ditemukan`);
    }

    if (inUse) {
      throw new DomainError(
        'IN_USE',
        'Data master sedang digunakan oleh data lain dan tidak dapat dihapus. Silakan nonaktifkan data ini.'
      );
    }

    await recordAuditLog(tx, {
      actorId,
      entityType: `Master_${type}`,
      entityId: id,
      action: 'DELETE',
      before,
      after: null,
    });

    return { success: true };
  });
}
