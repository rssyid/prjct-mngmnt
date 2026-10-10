import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/infra/session';
import { assertCan } from '@/shared/permissions';
import { listMaster, createMaster, MasterType } from '@/domain/master/master-service';
import { toHttpError } from '@/shared/errors';
import type { ApiResponse } from '@/shared/types/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    await requireSessionUser(request); // Semua role boleh melihat
    const { type } = await params;
    const { searchParams } = new URL(request.url);

    const data = await listMaster(type as MasterType, {
      active: searchParams.get('active'),
      q: searchParams.get('q'),
      regionId: searchParams.get('regionId'),
      companyId: searchParams.get('companyId'),
      wilayahId: searchParams.get('wilayahId'),
      estateId: searchParams.get('estateId'),
    });

    const response: ApiResponse<typeof data> = { data };
    return NextResponse.json(response);
  } catch (error) {
    const { status, body } = toHttpError(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const user = await requireSessionUser(request);
    assertCan(user, 'mutate:master');

    const { type } = await params;
    const body = await request.json();
    const result = await createMaster(type as MasterType, user.id, body);

    const response: ApiResponse<typeof result> = { data: result };
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const { status, body } = toHttpError(error);
    return NextResponse.json(body, { status });
  }
}
