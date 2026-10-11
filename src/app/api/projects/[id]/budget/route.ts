import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/infra/session';
import { getProjectBudgetSummary } from '@/domain/budget/budget-service';
import { toHttpError } from '@/shared/errors';
import type { ApiResponse } from '@/shared/types/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSessionUser(request); // Semua role dapat melihat ringkasan anggaran
    const { id } = await params;

    const data = await getProjectBudgetSummary(id);
    const response: ApiResponse<typeof data> = { data };
    return NextResponse.json(response);
  } catch (error) {
    const { status, body } = toHttpError(error);
    return NextResponse.json(body, { status });
  }
}
