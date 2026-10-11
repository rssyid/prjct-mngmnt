import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/infra/session';
import { assertCan } from '@/shared/permissions';
import {
  listProjectAfceAttempts,
  createAfceAttempt,
} from '@/domain/afce/afce-service';
import { createAfceAttemptSchema } from '@/shared/schemas/afce';
import { toHttpError } from '@/shared/errors';
import type { ApiResponse } from '@/shared/types/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSessionUser(request); // Semua role boleh membaca
    const { id } = await params;

    const attempts = await listProjectAfceAttempts(id);
    const response: ApiResponse<typeof attempts> = { data: attempts };
    return NextResponse.json(response);
  } catch (error) {
    const { status, body } = toHttpError(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSessionUser(request);
    assertCan(user, 'mutate:afce'); // SA dan SP

    const { id } = await params;
    const body = await request.json();
    const validated = createAfceAttemptSchema.parse(body);

    const attempt = await createAfceAttempt(id, validated, user.id);
    const response: ApiResponse<typeof attempt> = { data: attempt };
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const { status, body } = toHttpError(error);
    return NextResponse.json(body, { status });
  }
}
