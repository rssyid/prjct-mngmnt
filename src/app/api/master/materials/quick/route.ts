import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/infra/session';
import { assertCan } from '@/shared/permissions';
import { createQuickMaterial } from '@/domain/master/master-service';
import { toHttpError } from '@/shared/errors';
import type { ApiResponse } from '@/shared/types/api';

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser(request);
    assertCan(user, 'mutate:master');

    const body = await request.json();
    const result = await createQuickMaterial(user.id, body);

    const response: ApiResponse<typeof result> = { data: result };
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const { status, body } = toHttpError(error);
    return NextResponse.json(body, { status });
  }
}
