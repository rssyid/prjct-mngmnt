import { prisma, Prisma } from '@/infra/db';
import { DomainError } from '@/shared/errors';

export async function getProjectBudgetSummary(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      code: true,
      name: true,
      plannedBudget: true,
      status: true,
      deletedAt: true,
    },
  });

  if (!project || project.deletedAt) {
    throw new DomainError('NOT_FOUND', 'Proyek tidak ditemukan');
  }

  const entries = await prisma.budgetEntry.findMany({
    where: { projectId },
    orderBy: { effectiveDate: 'asc' },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      arSupplement: {
        select: { id: true, number: true, reason: true, date: true },
      },
    },
  });

  let totalOfficialBudget = new Prisma.Decimal(0);
  let initialEntry = null;
  const arEntries: typeof entries = [];

  for (const entry of entries) {
    totalOfficialBudget = totalOfficialBudget.add(entry.amount);
    if (entry.type === 'INITIAL') {
      initialEntry = entry;
    } else if (entry.type === 'AR_SUPPLEMENT') {
      arEntries.push(entry);
    }
  }

  return {
    project: {
      id: project.id,
      code: project.code,
      name: project.name,
      status: project.status,
    },
    plannedBudget: project.plannedBudget,
    totalOfficialBudget,
    initialEntry,
    arEntries,
    entries,
  };
}
