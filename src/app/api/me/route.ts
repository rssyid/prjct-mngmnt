import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/infra/session';
import { toHttpError } from '@/shared/errors';
import type { ApiResponse } from '@/shared/types/api';
import type { AuthUser } from '@/shared/permissions';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Silakan masuk terlebih dahulu',
          },
        },
        { status: 401 }
      );
    }

    const response: ApiResponse<AuthUser> = { data: user };
    return NextResponse.json(response);
  } catch (error) {
    const { status, body } = toHttpError(error);
    return NextResponse.json(body, { status });
  }
}
