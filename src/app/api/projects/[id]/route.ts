import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/infra/session';
import { assertCan } from '@/shared/permissions';
import { getProjectDetail, updateProject } from '@/domain/project/project-service';
import { updateProjectSchema } from '@/shared/schemas/project';
import { toHttpError } from '@/shared/errors';
import type { ApiResponse } from '@/shared/types/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSessionUser(request); // Semua role boleh melihat
    const { id } = await params;

    const project = await getProjectDetail(id);
    const response: ApiResponse<typeof project> = { data: project };
    return NextResponse.json(response);
  } catch (error) {
    const { status, body } = toHttpError(error);
    return NextResponse.json(body, { status });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSessionUser(request);
    assertCan(user, 'mutate:project');

    const { id } = await params;
    const body = await request.json();
    const validated = updateProjectSchema.parse(body);

    const updated = await updateProject(id, validated, user.id);
    const response: ApiResponse<typeof updated> = { data: updated };
    return NextResponse.json(response);
  } catch (error) {
    const { status, body } = toHttpError(error);
    return NextResponse.json(body, { status });
  }
}
