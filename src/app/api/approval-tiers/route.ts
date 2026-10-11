import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/infra/session';
import { assertCan } from '@/shared/permissions';
import {
  listApprovalTiers,
  createApprovalTier,
} from '@/domain/approval/approval-matrix-service';
import { createApprovalTierSchema } from '@/shared/schemas/approval-tier';
import { toHttpError } from '@/shared/errors';
import type { ApiResponse } from '@/shared/types/api';

export async function GET(request: NextRequest) {
  try {
    await requireSessionUser(request); // Semua role boleh melihat tier matriks
    const tiers = await listApprovalTiers();
    const response: ApiResponse<typeof tiers> = { data: tiers };
    return NextResponse.json(response);
  } catch (error) {
    const { status, body } = toHttpError(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser(request);
    assertCan(user, 'manage:approval_matrix'); // Hanya SA

    const body = await request.json();
    const validated = createApprovalTierSchema.parse(body);

    const tier = await createApprovalTier(validated, user.id);
    const response: ApiResponse<typeof tier> = { data: tier };
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const { status, body } = toHttpError(error);
    return NextResponse.json(body, { status });
  }
}
