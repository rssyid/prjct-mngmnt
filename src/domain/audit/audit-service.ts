import { prisma, Prisma } from '@/infra/db';

export interface AuditLogInput {
  actorId?: string | null;
  projectId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
}

export async function recordAuditLog(
  tx: Prisma.TransactionClient,
  input: AuditLogInput
) {
  return tx.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      projectId: input.projectId ?? null,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      before: input.before ? (input.before as Prisma.InputJsonValue) : Prisma.JsonNull,
      after: input.after ? (input.after as Prisma.InputJsonValue) : Prisma.JsonNull,
      reason: input.reason ?? null,
    },
  });
}

export interface AuditLogFilter {
  projectId?: string | null;
  entityType?: string | null;
  actorId?: string | null;
  from?: Date | null;
  to?: Date | null;
  page?: number;
  pageSize?: number;
}

export async function queryAuditLogs(filter: AuditLogFilter) {
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 25));
  const skip = (page - 1) * pageSize;

  const where: Prisma.AuditLogWhereInput = {};
  if (filter.projectId) where.projectId = filter.projectId;
  if (filter.entityType) where.entityType = filter.entityType;
  if (filter.actorId) where.actorId = filter.actorId;
  if (filter.from || filter.to) {
    where.createdAt = {};
    if (filter.from) where.createdAt.gte = filter.from;
    if (filter.to) where.createdAt.lte = filter.to;
  }

  const [total, items] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    }),
  ]);

  return { items, total, page, pageSize };
}
