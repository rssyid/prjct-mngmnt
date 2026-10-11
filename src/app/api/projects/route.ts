import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/infra/session';
import { assertCan } from '@/shared/permissions';
import { createProject, queryProjects } from '@/domain/project/project-service';
import { createProjectSchema, projectQuerySchema } from '@/shared/schemas/project';
import { toHttpError } from '@/shared/errors';
import type { ApiResponse } from '@/shared/types/api';

export async function GET(request: NextRequest) {
  try {
    await requireSessionUser(request); // Semua role boleh membaca (MV, SP, SA)
    const { searchParams } = new URL(request.url);

    const queryInput = projectQuerySchema.parse({
      status: searchParams.get('status') || undefined,
      companyIds: searchParams.get('companyIds') || undefined,
      regionIds: searchParams.get('regionIds') || undefined,
      wilayahIds: searchParams.get('wilayahIds') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      ops: searchParams.get('ops') || undefined,
      q: searchParams.get('q') || undefined,
      archived: searchParams.get('archived') || undefined,
      page: searchParams.get('page') || undefined,
      pageSize: searchParams.get('pageSize') || undefined,
    });

    const result = await queryProjects({
      status: queryInput.status,
      companyIds: queryInput.companyIds ? queryInput.companyIds.split(',') : undefined,
      regionIds: queryInput.regionIds ? queryInput.regionIds.split(',') : undefined,
      wilayahIds: queryInput.wilayahIds ? queryInput.wilayahIds.split(',') : undefined,
      categoryId: queryInput.categoryId,
      ops: queryInput.ops,
      q: queryInput.q,
      archived: queryInput.archived === 'true',
      page: queryInput.page ? parseInt(queryInput.page, 10) : 1,
      pageSize: queryInput.pageSize ? parseInt(queryInput.pageSize, 10) : 25,
    });

    const response: ApiResponse<typeof result.items> = {
      data: result.items,
      meta: result.meta,
    };
    return NextResponse.json(response);
  } catch (error) {
    const { status, body } = toHttpError(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser(request);
    assertCan(user, 'mutate:project'); // Hanya SA dan SP

    const body = await request.json();
    const validated = createProjectSchema.parse(body);

    const project = await createProject(validated, user.id);

    const response: ApiResponse<typeof project> = { data: project };
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const { status, body } = toHttpError(error);
    return NextResponse.json(body, { status });
  }
}
