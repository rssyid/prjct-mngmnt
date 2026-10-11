import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/infra/session';
import { assertCan } from '@/shared/permissions';
import {
  listProjectArSupplements,
  createArSupplement,
} from '@/domain/ar/ar-supplement-service';
import { createArSupplementSchema } from '@/shared/schemas/ar-supplement';
import { toHttpError } from '@/shared/errors';
import type { ApiResponse } from '@/shared/types/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSessionUser(request); // Semua role boleh membaca
    const { id } = await params;

    const data = await listProjectArSupplements(id);
    const response: ApiResponse<typeof data> = { data };
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
    const validated = createArSupplementSchema.parse(body);

    const ar = await createArSupplement(id, validated, user.id);
    const response: ApiResponse<typeof ar> = { data: ar };
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const { status, body } = toHttpError(error);
    return NextResponse.json(body, { status });
  }
}
