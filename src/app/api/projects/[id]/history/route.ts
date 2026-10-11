import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/infra/session';
import { prisma } from '@/infra/db';
import { queryAuditLogs } from '@/domain/audit/audit-service';
import { DomainError, toHttpError } from '@/shared/errors';
import type { ApiResponse } from '@/shared/types/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSessionUser(request); // Semua role boleh membaca riwayat
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true, code: true, name: true, deletedAt: true },
    });

    if (!project || project.deletedAt) {
      throw new DomainError('NOT_FOUND', 'Proyek tidak ditemukan');
    }

    const [statusHistory, auditResult] = await Promise.all([
      prisma.projectStatusHistory.findMany({
        where: { projectId: id },
        orderBy: { at: 'desc' },
        include: {
          actor: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      queryAuditLogs({
        projectId: id,
        pageSize: 100,
      }),
    ]);

    const response: ApiResponse<{
      statusHistory: typeof statusHistory;
      auditLogs: typeof auditResult.items;
    }> = {
      data: {
        statusHistory,
        auditLogs: auditResult.items,
      },
    };
    return NextResponse.json(response);
  } catch (error) {
    const { status, body } = toHttpError(error);
    return NextResponse.json(body, { status });
  }
}
