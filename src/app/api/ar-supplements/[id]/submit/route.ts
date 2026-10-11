import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/infra/session';
import { assertCan } from '@/shared/permissions';
import { submitArSupplement } from '@/domain/ar/ar-supplement-service';
import { submitArSchema } from '@/shared/schemas/ar-supplement';
import { toHttpError } from '@/shared/errors';
import type { ApiResponse } from '@/shared/types/api';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSessionUser(request);
    assertCan(user, 'mutate:afce');

    const { id } = await params;
    const body = await request.json();
    const validated = submitArSchema.parse(body);

    const result = await submitArSupplement(id, validated, user.id);
    const response: ApiResponse<typeof result> = { data: result };
    return NextResponse.json(response);
  } catch (error) {
    const { status, body } = toHttpError(error);
    return NextResponse.json(body, { status });
  }
}
