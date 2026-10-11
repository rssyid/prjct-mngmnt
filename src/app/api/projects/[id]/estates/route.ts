import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/infra/session';
import { assertCan } from '@/shared/permissions';
import { updateProjectEstates } from '@/domain/project/project-service';
import { updateProjectEstatesSchema } from '@/shared/schemas/project';
import { toHttpError } from '@/shared/errors';
import type { ApiResponse } from '@/shared/types/api';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSessionUser(request);
    assertCan(user, 'mutate:project');

    const { id } = await params;
    const body = await request.json();
    const validated = updateProjectEstatesSchema.parse(body);

    const updated = await updateProjectEstates(
      id,
      validated.estates,
      user.id,
      validated.version
    );

    const response: ApiResponse<typeof updated> = { data: updated };
    return NextResponse.json(response);
  } catch (error) {
    const { status, body } = toHttpError(error);
    return NextResponse.json(body, { status });
  }
}
