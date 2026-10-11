import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/infra/session';
import { assertCan } from '@/shared/permissions';
import { getProjectSurvey, upsertProjectSurvey } from '@/domain/survey/survey-service';
import { upsertSurveySchema } from '@/shared/schemas/survey';
import { toHttpError } from '@/shared/errors';
import type { ApiResponse } from '@/shared/types/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSessionUser(request); // Semua role boleh melihat survei
    const { id } = await params;

    const data = await getProjectSurvey(id);
    const response: ApiResponse<typeof data> = { data };
    return NextResponse.json(response);
  } catch (error) {
    const { status, body } = toHttpError(error);
    return NextResponse.json(body, { status });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSessionUser(request);
    assertCan(user, 'mutate:survey'); // SA dan SP

    const { id } = await params;
    const body = await request.json();
    const validated = upsertSurveySchema.parse(body);

    const survey = await upsertProjectSurvey(id, validated, user.id);
    const response: ApiResponse<typeof survey> = { data: survey };
    return NextResponse.json(response);
  } catch (error) {
    const { status, body } = toHttpError(error);
    return NextResponse.json(body, { status });
  }
}
