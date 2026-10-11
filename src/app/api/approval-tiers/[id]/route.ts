import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/infra/session';
import { assertCan } from '@/shared/permissions';
import { updateApprovalTier } from '@/domain/approval/approval-matrix-service';
import { updateApprovalTierSchema } from '@/shared/schemas/approval-tier';
import { toHttpError } from '@/shared/errors';
import type { ApiResponse } from '@/shared/types/api';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSessionUser(request);
    assertCan(user, 'manage:approval_matrix'); // Hanya SA

    const { id } = await params;
    const body = await request.json();
    const validated = updateApprovalTierSchema.parse(body);

    const updated = await updateApprovalTier(id, validated, user.id);
    const response: ApiResponse<typeof updated> = { data: updated };
    return NextResponse.json(response);
  } catch (error) {
    const { status, body } = toHttpError(error);
    return NextResponse.json(body, { status });
  }
}
