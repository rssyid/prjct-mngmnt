import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/infra/session';
import { queryAuditLogs } from '@/domain/audit/audit-service';
import { toHttpError } from '@/shared/errors';
import type { ApiResponse } from '@/shared/types/api';

export async function GET(request: NextRequest) {
  try {
    await requireSessionUser(request);
    const { searchParams } = new URL(request.url);

    const projectId = searchParams.get('projectId');
    const entityType = searchParams.get('entityType');
    const actorId = searchParams.get('actorId');
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '25', 10);

    const result = await queryAuditLogs({
      projectId,
      entityType,
      actorId,
      from: fromStr ? new Date(fromStr) : null,
      to: toStr ? new Date(toStr) : null,
      page,
      pageSize,
    });

    const response: ApiResponse<typeof result.items> = {
      data: result.items,
      meta: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    const { status, body } = toHttpError(error);
    return NextResponse.json(body, { status });
  }
}
