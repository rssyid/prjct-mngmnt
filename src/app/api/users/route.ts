import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/infra/session';
import { assertCan } from '@/shared/permissions';
import { listUsers, createUser } from '@/domain/admin/user-service';
import { toHttpError } from '@/shared/errors';
import type { ApiResponse } from '@/shared/types/api';

export async function GET(request: NextRequest) {
  try {
    const user = await requireSessionUser(request);
    assertCan(user, 'manage:users'); // Khusus Super Admin

    const data = await listUsers();
    const response: ApiResponse<typeof data> = { data };
    return NextResponse.json(response);
  } catch (error) {
    const { status, body } = toHttpError(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser(request);
    assertCan(user, 'manage:users'); // Khusus Super Admin

    const body = await request.json();
    const result = await createUser(user.id, body);

    const response: ApiResponse<typeof result> = { data: result };
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const { status, body } = toHttpError(error);
    return NextResponse.json(body, { status });
  }
}
