import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/infra/session';
import { assertCan } from '@/shared/permissions';
import { transitionProjectStatus } from '@/domain/project-transition/transition-service';
import { cancelProjectSchema } from '@/shared/schemas/project';
import { toHttpError } from '@/shared/errors';
import type { ApiResponse } from '@/shared/types/api';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSessionUser(request);
    assertCan(user, 'cancel:project'); // Hanya SA

    const { id } = await params;
    const body = await request.json();
    const validated = cancelProjectSchema.parse(body);

    const result = await transitionProjectStatus({
      projectId: id,
      toStatus: 'CANCELLED',
      actorId: user.id,
      reason: validated.reason,
    });

    const response: ApiResponse<{
      project: typeof result.project;
      history: typeof result.history;
      projectStatus: string;
    }> = {
      data: {
        project: result.project,
        history: result.history,
        projectStatus: result.project.status,
      },
    };
    return NextResponse.json(response);
  } catch (error) {
    const { status, body } = toHttpError(error);
    return NextResponse.json(body, { status });
  }
}
