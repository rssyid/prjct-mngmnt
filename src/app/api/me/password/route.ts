import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/infra/session';
import { changePasswordSchema } from '@/shared/schemas/auth';
import { toHttpError } from '@/shared/errors';
import { hashPassword } from 'better-auth/crypto';
import { prisma } from '@/infra/db';
import { recordAuditLog } from '@/domain/audit/audit-service';
import type { ApiResponse } from '@/shared/types/api';

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser(request);
    const body = await request.json();
    const parsed = changePasswordSchema.parse(body);

    const hashedPassword = await hashPassword(parsed.newPassword);

    await prisma.$transaction(async (tx) => {
      // Periksa apakah akun kredensial sudah ada
      const existingAccount = await tx.account.findFirst({
        where: {
          userId: user.id,
          providerId: 'credential',
        },
      });

      if (existingAccount) {
        await tx.account.update({
          where: { id: existingAccount.id },
          data: { password: hashedPassword },
        });
      } else {
        await tx.account.create({
          data: {
            id: `acc_${user.id}_${Date.now()}`,
            userId: user.id,
            providerId: 'credential',
            accountId: user.email,
            password: hashedPassword,
          },
        });
      }

      await tx.user.update({
        where: { id: user.id },
        data: { mustChangePassword: false },
      });

      await recordAuditLog(tx, {
        actorId: user.id,
        entityType: 'User',
        entityId: user.id,
        action: 'CHANGE_PASSWORD',
        before: { mustChangePassword: user.mustChangePassword },
        after: { mustChangePassword: false },
      });
    });

    const response: ApiResponse<{ success: boolean }> = {
      data: { success: true },
    };
    return NextResponse.json(response);
  } catch (error) {
    const { status, body } = toHttpError(error);
    return NextResponse.json(body, { status });
  }
}
