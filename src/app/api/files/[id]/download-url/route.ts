import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/infra/session';
import { getFileDownloadUrl } from '@/domain/files/file-service';
import { toHttpError } from '@/shared/errors';
import type { ApiResponse } from '@/shared/types/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSessionUser(request); // Semua role boleh unduh

    const { id } = await params;
    const result = await getFileDownloadUrl(id);

    const response: ApiResponse<typeof result> = { data: result };
    return NextResponse.json(response);
  } catch (error) {
    const { status, body } = toHttpError(error);
    return NextResponse.json(body, { status });
  }
}
