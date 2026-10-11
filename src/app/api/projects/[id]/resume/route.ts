import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/infra/session';
import { assertCan } from '@/shared/permissions';
import { transitionProjectStatus } from '@/domain/project-transition/transition-service';
import { prisma } from '@/infra/db';
import { DomainError, toHttpError } from '@/shared/errors';
import type { ApiResponse } from '@/shared/types/api';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSessionUser(request);
    assertCan(user, 'hold_resume:project'); // SA dan SP

    const { id } = await params;

    // Ambil previousStatus proyek saat ini
    const project = await prisma.project.findUnique({
      where: { id },
      select: { previousStatus: true, status: true },
    });

    if (!project) {
      throw new DomainError('NOT_FOUND', 'Proyek tidak ditemukan');
    }

    if (project.status !== 'ON_HOLD' || !project.previousStatus) {
      throw new DomainError(
        'INVALID_TRANSITION',
        'Proyek tidak dalam status ditahan (ON_HOLD)'
      );
    }

    const result = await transitionProjectStatus({
      projectId: id,
      toStatus: project.previousStatus,
      actorId: user.id,
      reason: 'Melanjutkan proyek dari status ditahan',
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
