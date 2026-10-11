import { prisma, Prisma } from '@/infra/db';
import { DomainError } from '@/shared/errors';
import { recordAuditLog } from '@/domain/audit/audit-service';
import type {
  CreateProjectInput,
  UpdateProjectInput,
  ProjectEstateInput,
} from '@/shared/schemas/project';
import { getCurrentWibDate } from '@/shared/lib/date';

/**
 * Atomically generates the next project code: WM-{Company.code}-{YYYY}-{SEQ4} (AC-10)
 * Uses SELECT ... FOR UPDATE on ProjectCodeCounter within a transaction to prevent race conditions.
 */
export async function generateNextProjectCode(
  tx: Prisma.TransactionClient,
  companyId: string,
  companyCode: string,
  year?: number
): Promise<string> {
  const currentYear = year ?? getCurrentWibDate().getFullYear();

  const rows = await tx.$queryRaw<Array<{ lastSeq: number }>>`
    INSERT INTO "ProjectCodeCounter" ("companyId", "year", "lastSeq")
    VALUES (${companyId}, ${currentYear}, 1)
    ON CONFLICT ("companyId", "year")
    DO UPDATE SET "lastSeq" = "ProjectCodeCounter"."lastSeq" + 1
    RETURNING "lastSeq"
  `;

  const nextSeq = rows[0]?.lastSeq ?? 1;
  const seqStr = String(nextSeq).padStart(4, '0');
  return `WM-${companyCode}-${currentYear}-${seqStr}`;
}

/**
 * Validates project estate relationships (AC-11)
 * - Must have >= 1 estate
 * - Exactly one primary estate
 * - All estates must belong to project's company
 * - Blocks must belong to the corresponding estate
 */
export async function validateProjectEstates(
  tx: Prisma.TransactionClient,
  companyId: string,
  estates: ProjectEstateInput[]
) {
  if (!estates || estates.length === 0) {
    throw new DomainError(
      'PRECONDITION_FAILED',
      'Proyek harus memiliki minimal satu Estate'
    );
  }

  const primaryCount = estates.filter((e) => e.isPrimary).length;
  if (primaryCount !== 1) {
    throw new DomainError(
      'PRECONDITION_FAILED',
      'Proyek harus memiliki tepat satu Estate utama'
    );
  }

  const estateIds = estates.map((e) => e.estateId);
  // Check duplicates in input
  const uniqueEstateIds = new Set(estateIds);
  if (uniqueEstateIds.size !== estateIds.length) {
    throw new DomainError(
      'PRECONDITION_FAILED',
      'Daftar Estate tidak boleh memuat Estate yang duplikat'
    );
  }

  const dbEstates = await tx.estate.findMany({
    where: { id: { in: estateIds } },
    select: { id: true, companyId: true, code: true, name: true },
  });

  if (dbEstates.length !== estateIds.length) {
    throw new DomainError(
      'NOT_FOUND',
      'Satu atau lebih Estate yang dipilih tidak ditemukan'
    );
  }

  for (const est of dbEstates) {
    if (est.companyId !== companyId) {
      throw new DomainError(
        'PRECONDITION_FAILED',
        `Estate ${est.name} (${est.code}) bukan milik Company proyek`
      );
    }
  }

  // Validate blocks if provided
  const blockPairs = estates.filter((e) => Boolean(e.blockId));
  if (blockPairs.length > 0) {
    const blockIds = blockPairs.map((e) => e.blockId as string);
    const dbBlocks = await tx.block.findMany({
      where: { id: { in: blockIds } },
      select: { id: true, estateId: true, blockCode: true, name: true },
    });

    for (const pair of blockPairs) {
      const foundBlock = dbBlocks.find((b) => b.id === pair.blockId);
      if (!foundBlock) {
        throw new DomainError('NOT_FOUND', 'Block yang dipilih tidak ditemukan');
      }
      if (foundBlock.estateId !== pair.estateId) {
        throw new DomainError(
          'PRECONDITION_FAILED',
          `Block ${foundBlock.blockCode} bukan milik Estate yang dipilih`
        );
      }
    }
  }
}

export async function createProject(
  input: CreateProjectInput,
  actorId: string
) {
  return prisma.$transaction(async (tx) => {
    // 1. Validate Company
    const company = await tx.company.findUnique({
      where: { id: input.companyId },
      select: { id: true, code: true, name: true, isActive: true },
    });
    if (!company) {
      throw new DomainError('NOT_FOUND', 'Company tidak ditemukan');
    }

    // 2. Validate Category
    const category = await tx.projectCategory.findUnique({
      where: { id: input.categoryId },
      select: { id: true, code: true, name: true, isActive: true },
    });
    if (!category) {
      throw new DomainError('NOT_FOUND', 'Kategori proyek tidak ditemukan');
    }

    // 3. Validate Estates & Blocks (AC-11)
    await validateProjectEstates(tx, input.companyId, input.estates);

    // 4. Generate Atomic Code (AC-10)
    const code = await generateNextProjectCode(tx, company.id, company.code);

    // 5. Create Project (Initial status DRAFT)
    const project = await tx.project.create({
      data: {
        code,
        name: input.name.trim(),
        description: input.description?.trim() ?? null,
        companyId: company.id,
        categoryId: category.id,
        picUserId: input.picUserId ?? null,
        targetStartDate: input.targetStartDate ? new Date(input.targetStartDate) : null,
        targetEndDate: input.targetEndDate ? new Date(input.targetEndDate) : null,
        plannedBudget:
          input.plannedBudget !== undefined && input.plannedBudget !== null
            ? new Prisma.Decimal(input.plannedBudget)
            : null,
        status: 'DRAFT',
        createdById: actorId,
        estates: {
          create: input.estates.map((e) => ({
            estateId: e.estateId,
            isPrimary: Boolean(e.isPrimary),
            blockId: e.blockId ?? null,
          })),
        },
      },
      include: {
        company: true,
        category: true,
        pic: { select: { id: true, name: true, email: true } },
        estates: {
          include: {
            estate: {
              include: {
                wilayah: {
                  include: { region: true },
                },
              },
            },
            block: true,
          },
        },
      },
    });

    // 6. Record Initial Status History
    await tx.projectStatusHistory.create({
      data: {
        projectId: project.id,
        fromStatus: null,
        toStatus: 'DRAFT',
        reason: 'Pembuatan proyek baru',
        actorId,
      },
    });

    // 7. Audit Log
    await recordAuditLog(tx, {
      actorId,
      projectId: project.id,
      entityType: 'Project',
      entityId: project.id,
      action: 'CREATE',
      after: {
        code: project.code,
        name: project.name,
        companyId: project.companyId,
        categoryId: project.categoryId,
        status: project.status,
      },
    });

    return project;
  });
}

export async function updateProject(
  id: string,
  input: UpdateProjectInput,
  actorId: string
) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.findUnique({
      where: { id },
    });

    if (!project || project.deletedAt) {
      throw new DomainError('NOT_FOUND', 'Proyek tidak ditemukan');
    }

    if (project.status === 'COMPLETED' || project.status === 'CANCELLED') {
      throw new DomainError(
        'PROJECT_LOCKED',
        'Proyek berada dalam status final dan terkunci untuk seluruh perubahan'
      );
    }

    if (input.version !== undefined && project.version !== input.version) {
      throw new DomainError(
        'VERSION_CONFLICT',
        'Data proyek telah diperbarui oleh pengguna lain'
      );
    }

    // Gate: plannedBudget can only be modified before AFCE is submitted
    if (input.plannedBudget !== undefined) {
      const submittedAfce = await tx.afceAttempt.findFirst({
        where: {
          projectId: id,
          submittedDate: { not: null },
        },
      });
      if (submittedAfce) {
        throw new DomainError(
          'FIELD_INPUT_LOCKED',
          'Anggaran rencana terkunci karena AFCE telah diajukan'
        );
      }
    }

    const updateData: Prisma.ProjectUpdateInput = {
      version: { increment: 1 },
    };

    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.description !== undefined) {
      updateData.description = input.description?.trim() ?? null;
    }
    if (input.categoryId !== undefined) {
      updateData.category = { connect: { id: input.categoryId } };
    }
    if (input.picUserId !== undefined) {
      updateData.pic = input.picUserId
        ? { connect: { id: input.picUserId } }
        : { disconnect: true };
    }
    if (input.targetStartDate !== undefined) {
      updateData.targetStartDate = input.targetStartDate
        ? new Date(input.targetStartDate)
        : null;
    }
    if (input.targetEndDate !== undefined) {
      updateData.targetEndDate = input.targetEndDate
        ? new Date(input.targetEndDate)
        : null;
    }
    if (input.plannedBudget !== undefined) {
      updateData.plannedBudget =
        input.plannedBudget !== null
          ? new Prisma.Decimal(input.plannedBudget)
          : null;
    }

    const updated = await tx.project.update({
      where: { id: project.id, version: project.version },
      data: updateData,
      include: {
        company: true,
        category: true,
        pic: { select: { id: true, name: true, email: true } },
        estates: {
          include: {
            estate: {
              include: {
                wilayah: {
                  include: { region: true },
                },
              },
            },
            block: true,
          },
        },
      },
    });

    await recordAuditLog(tx, {
      actorId,
      projectId: id,
      entityType: 'Project',
      entityId: id,
      action: 'UPDATE',
      before: {
        name: project.name,
        categoryId: project.categoryId,
        picUserId: project.picUserId,
        targetStartDate: project.targetStartDate,
        targetEndDate: project.targetEndDate,
        plannedBudget: project.plannedBudget?.toString() ?? null,
      },
      after: {
        name: updated.name,
        categoryId: updated.categoryId,
        picUserId: updated.picUserId,
        targetStartDate: updated.targetStartDate,
        targetEndDate: updated.targetEndDate,
        plannedBudget: updated.plannedBudget?.toString() ?? null,
      },
    });

    return updated;
  });
}

/**
 * Updates project estates (AC-11).
 * Allowed only before PROCUREMENT stage (docs/04 §3).
 */
export async function updateProjectEstates(
  id: string,
  estates: ProjectEstateInput[],
  actorId: string,
  version?: number
) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.findUnique({
      where: { id },
      include: { estates: true },
    });

    if (!project || project.deletedAt) {
      throw new DomainError('NOT_FOUND', 'Proyek tidak ditemukan');
    }

    if (project.status === 'COMPLETED' || project.status === 'CANCELLED') {
      throw new DomainError(
        'PROJECT_LOCKED',
        'Proyek berada dalam status final dan terkunci'
      );
    }

    if (version !== undefined && project.version !== version) {
      throw new DomainError(
        'VERSION_CONFLICT',
        'Data proyek telah diperbarui oleh pengguna lain'
      );
    }

    // Gate: Locked once project reaches PROCUREMENT or further
    const lockedStatuses = [
      'PROCUREMENT',
      'EXECUTION',
      'WAITING_BAST',
      'COMPLETED',
      'CANCELLED',
    ];
    if (lockedStatuses.includes(project.status)) {
      throw new DomainError(
        'FIELD_INPUT_LOCKED',
        'Lokasi Estate proyek terkunci setelah tahap pengadaan (PROCUREMENT)'
      );
    }

    await validateProjectEstates(tx, project.companyId, estates);

    // Delete existing ProjectEstates
    await tx.projectEstate.deleteMany({
      where: { projectId: id },
    });

    // Create new ProjectEstates
    await tx.projectEstate.createMany({
      data: estates.map((e) => ({
        projectId: id,
        estateId: e.estateId,
        isPrimary: Boolean(e.isPrimary),
        blockId: e.blockId ?? null,
      })),
    });

    // Bump version
    const updated = await tx.project.update({
      where: { id, version: project.version },
      data: { version: { increment: 1 } },
      include: {
        estates: {
          include: {
            estate: {
              include: {
                wilayah: {
                  include: { region: true },
                },
              },
            },
            block: true,
          },
        },
      },
    });

    await recordAuditLog(tx, {
      actorId,
      projectId: id,
      entityType: 'Project',
      entityId: id,
      action: 'UPDATE_ESTATES',
      before: { estates: project.estates },
      after: { estates: updated.estates },
    });

    return updated;
  });
}

export interface ProjectFilterParams {
  status?: string | null;
  companyIds?: string[] | null;
  regionIds?: string[] | null;
  wilayahIds?: string[] | null;
  categoryId?: string | null;
  ops?: string | null;
  q?: string | null;
  archived?: boolean | null;
  page?: number | null;
  pageSize?: number | null;
}

/**
 * Queries projects with multi-Estate filtering across Regions and Wilayahs (AC-13)
 */
export async function queryProjects(params: ProjectFilterParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 25));
  const skip = (page - 1) * pageSize;

  const where: Prisma.ProjectWhereInput = {
    deletedAt: null,
  };

  if (params.status) {
    where.status = params.status as Prisma.EnumProjectStatusFilter;
  }

  if (params.companyIds && params.companyIds.length > 0) {
    where.companyId = { in: params.companyIds };
  }

  if (params.categoryId) {
    where.categoryId = params.categoryId;
  }

  // Location filtering on estates (AC-13)
  const estateConditions: Prisma.EstateWhereInput = {};
  let hasLocationFilter = false;

  if (params.regionIds && params.regionIds.length > 0) {
    estateConditions.wilayah = {
      regionId: { in: params.regionIds },
    };
    hasLocationFilter = true;
  }

  if (params.wilayahIds && params.wilayahIds.length > 0) {
    estateConditions.wilayahId = { in: params.wilayahIds };
    hasLocationFilter = true;
  }

  if (params.ops) {
    estateConditions.wilayah = {
      ...(estateConditions.wilayah as Prisma.WilayahWhereInput),
      region: { ops: params.ops as any },
    };
    hasLocationFilter = true;
  }

  if (hasLocationFilter) {
    where.estates = {
      some: {
        estate: estateConditions,
      },
    };
  }

  // Search keyword (name or code)
  if (params.q && params.q.trim()) {
    const query = params.q.trim();
    where.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { code: { contains: query, mode: 'insensitive' } },
    ];
  }

  // Archive filtering: archived = 1 year after COMPLETED or CANCELLED
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  if (params.archived) {
    // Only return archived projects
    where.OR = [
      { status: 'COMPLETED', completedAt: { lte: oneYearAgo } },
      { status: 'CANCELLED', cancelledAt: { lte: oneYearAgo } },
    ];
  } else {
    // Exclude archived projects
    where.NOT = [
      { status: 'COMPLETED', completedAt: { lte: oneYearAgo } },
      { status: 'CANCELLED', cancelledAt: { lte: oneYearAgo } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { id: true, code: true, name: true } },
        category: { select: { id: true, code: true, name: true } },
        pic: { select: { id: true, name: true } },
        estates: {
          include: {
            estate: {
              select: {
                id: true,
                code: true,
                name: true,
                wilayah: {
                  select: {
                    id: true,
                    name: true,
                    region: { select: { id: true, code: true, name: true, ops: true } },
                  },
                },
              },
            },
            block: { select: { id: true, blockCode: true, name: true } },
          },
        },
      },
    }),
  ]);

  return {
    items,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function getProjectDetail(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      company: true,
      category: true,
      pic: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      cancelledBy: { select: { id: true, name: true } },
      estates: {
        include: {
          estate: {
            include: {
              wilayah: {
                include: { region: true },
              },
            },
          },
          block: true,
        },
      },
      survey: true,
      afceAttempts: {
        orderBy: { attemptNo: 'asc' },
        include: {
          matrixTier: true,
          levels: {
            orderBy: { levelNo: 'asc' },
            include: {
              position: true,
              record: true,
            },
          },
          boqItems: {
            orderBy: { lineNo: 'asc' },
          },
        },
      },
      arSupplements: {
        orderBy: { createdAt: 'asc' },
        include: {
          matrixTier: true,
          levels: {
            orderBy: { levelNo: 'asc' },
            include: {
              position: true,
              record: true,
            },
          },
        },
      },
      budgetEntries: {
        orderBy: { createdAt: 'asc' },
        include: {
          createdBy: { select: { id: true, name: true } },
        },
      },
      statusHistory: {
        orderBy: { at: 'desc' },
        include: {
          actor: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!project || project.deletedAt) {
    throw new DomainError('NOT_FOUND', 'Proyek tidak ditemukan');
  }

  return project;
}
