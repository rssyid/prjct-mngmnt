import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/infra/session';
import { assertCan } from '@/shared/permissions';
import { recordApprovalDecision } from '@/domain/approval/approval-decision-service';
import { recordApprovalDecisionSchema } from '@/shared/schemas/approval-record';
import { toHttpError } from '@/shared/errors';
import type { ApiResponse } from '@/shared/types/api';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ levelId: string }> }
) {
  try {
    const user = await requireSessionUser(request);
    assertCan(user, 'mutate:afce'); // SA dan SP

    const { levelId } = await params;
    const body = await request.json();
    const validated = recordApprovalDecisionSchema.parse(body);

    const result = await recordApprovalDecision(levelId, validated, user.id);
    const response: ApiResponse<typeof result> = { data: result };
    return NextResponse.json(response);
  } catch (error) {
    const { status, body } = toHttpError(error);
    return NextResponse.json(body, { status });
  }
}
