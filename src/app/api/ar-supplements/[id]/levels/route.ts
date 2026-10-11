import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/infra/session';
import { assertCan } from '@/shared/permissions';
import { updateArLevels } from '@/domain/ar/ar-supplement-service';
import { updateArLevelsSchema } from '@/shared/schemas/ar-supplement';
import { toHttpError } from '@/shared/errors';
import type { ApiResponse } from '@/shared/types/api';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSessionUser(request);
    assertCan(user, 'mutate:afce');

    const { id } = await params;
    const body = await request.json();
    const validated = updateArLevelsSchema.parse(body);

    const updated = await updateArLevels(id, validated, user.id);
    const response: ApiResponse<typeof updated> = { data: updated };
    return NextResponse.json(response);
  } catch (error) {
    const { status, body } = toHttpError(error);
    return NextResponse.json(body, { status });
  }
}
