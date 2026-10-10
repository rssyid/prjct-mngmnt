import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/infra/session';
import { assertCan } from '@/shared/permissions';
import { confirmFileUpload } from '@/domain/files/file-service';
import { toHttpError } from '@/shared/errors';
import type { ApiResponse } from '@/shared/types/api';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSessionUser(request);
    assertCan(user, 'mutate:project'); // SA dan SP boleh

    const { id } = await params;
    const result = await confirmFileUpload(id);

    const response: ApiResponse<typeof result> = { data: result };
    return NextResponse.json(response);
  } catch (error) {
    const { status, body } = toHttpError(error);
    return NextResponse.json(body, { status });
  }
}
