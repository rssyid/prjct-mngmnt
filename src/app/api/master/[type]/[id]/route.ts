import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/infra/session';
import { assertCan } from '@/shared/permissions';
import { updateMaster, deleteMaster, MasterType } from '@/domain/master/master-service';
import { toHttpError } from '@/shared/errors';
import type { ApiResponse } from '@/shared/types/api';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const user = await requireSessionUser(request);
    assertCan(user, 'mutate:master');

    const { type, id } = await params;
    const body = await request.json();
    const result = await updateMaster(type as MasterType, id, user.id, body);

    const response: ApiResponse<typeof result> = { data: result };
    return NextResponse.json(response);
  } catch (error) {
    const { status, body } = toHttpError(error);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const user = await requireSessionUser(request);
    assertCan(user, 'mutate:master');

    const { type, id } = await params;
    const result = await deleteMaster(type as MasterType, id, user.id);

    const response: ApiResponse<typeof result> = { data: result };
    return NextResponse.json(response);
  } catch (error) {
    const { status, body } = toHttpError(error);
    return NextResponse.json(body, { status });
  }
}
