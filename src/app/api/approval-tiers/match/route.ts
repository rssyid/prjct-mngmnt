import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/infra/session';
import { matchApprovalTier } from '@/domain/approval/approval-matrix-service';
import { DomainError, toHttpError } from '@/shared/errors';
import type { ApiResponse } from '@/shared/types/api';

export async function GET(request: NextRequest) {
  try {
    await requireSessionUser(request); // Semua role boleh mencocokkan tier
    const { searchParams } = new URL(request.url);

    const doc = searchParams.get('doc');
    const amountStr = searchParams.get('amount');

    if (doc !== 'AFCE' && doc !== 'AR') {
      throw new DomainError(
        'VALIDATION_ERROR',
        'Parameter doc harus bernilai AFCE atau AR'
      );
    }

    if (!amountStr || isNaN(Number(amountStr))) {
      throw new DomainError(
        'VALIDATION_ERROR',
        'Parameter amount harus berupa angka valid'
      );
    }

    const matchedTier = await matchApprovalTier(doc, amountStr);
    const response: ApiResponse<typeof matchedTier> = { data: matchedTier };
    return NextResponse.json(response);
  } catch (error) {
    const { status, body } = toHttpError(error);
    return NextResponse.json(body, { status });
  }
}
