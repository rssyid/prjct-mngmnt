import { prisma } from '@/infra/db';
import { hashPassword } from 'better-auth/crypto';
import { DomainError } from '@/shared/errors';
import { recordAuditLog } from '@/domain/audit/audit-service';
import {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  CreateUserInput,
  UpdateUserInput,
  ResetPasswordInput,
} from '@/shared/schemas/auth';

export async function listUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function createUser(actorId: string, input: CreateUserInput) {
  const parsed = createUserSchema.parse(input);

  const existing = await prisma.user.findUnique({
    where: { email: parsed.email },
  });
  if (existing) {
    throw new DomainError('DUPLICATE', 'Email pengguna sudah terdaftar');
  }

  const hashedPassword = await hashPassword(parsed.temporaryPassword);

  return prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: parsed.name,
        email: parsed.email,
        role: parsed.role,
        isActive: true,
        mustChangePassword: true, // AC-04: user baru wajib ganti password
      },
    });

    await tx.account.create({
      data: {
        id: `acc_${newUser.id}`,
        userId: newUser.id,
        providerId: 'credential',
        accountId: newUser.id,
        password: hashedPassword,
      },
    });

    await recordAuditLog(tx, {
      actorId,
      entityType: 'User',
      entityId: newUser.id,
      action: 'CREATE_USER',
      before: null,
      after: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isActive: newUser.isActive,
        mustChangePassword: newUser.mustChangePassword,
      },
    });

    return newUser;
  });
}

export async function updateUser(
  actorId: string,
  userId: string,
  input: UpdateUserInput
) {
  const parsed = updateUserSchema.parse(input);

  const before = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!before) {
    throw new DomainError('NOT_FOUND', 'Pengguna tidak ditemukan');
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: parsed,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        updatedAt: true,
      },
    });

    // Jika dinonaktifkan, cabut semua sesi aktifnya
    if (parsed.isActive === false) {
      await tx.session.deleteMany({ where: { userId } });
    }

    await recordAuditLog(tx, {
      actorId,
      entityType: 'User',
      entityId: userId,
      action: 'UPDATE_USER',
      before: {
        name: before.name,
        role: before.role,
        isActive: before.isActive,
        mustChangePassword: before.mustChangePassword,
      },
      after: {
        name: updated.name,
        role: updated.role,
        isActive: updated.isActive,
        mustChangePassword: updated.mustChangePassword,
      },
    });

    return updated;
  });
}

export async function resetUserPassword(
  actorId: string,
  userId: string,
  input: ResetPasswordInput
) {
  const parsed = resetPasswordSchema.parse(input);

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new DomainError('NOT_FOUND', 'Pengguna tidak ditemukan');
  }

  const hashedPassword = await hashPassword(parsed.temporaryPassword);

  return prisma.$transaction(async (tx) => {
    // 1. Update password di Account
    const existingAccount = await tx.account.findFirst({
      where: { userId, providerId: 'credential' },
    });

    if (existingAccount) {
      await tx.account.update({
        where: { id: existingAccount.id },
        data: { password: hashedPassword },
      });
    } else {
      await tx.account.create({
        data: {
          id: `acc_${userId}_${Date.now()}`,
          userId,
          providerId: 'credential',
          accountId: userId,
          password: hashedPassword,
        },
      });
    }

    // 2. Wajib ganti password saat login berikutnya (AC-04)
    await tx.user.update({
      where: { id: userId },
      data: { mustChangePassword: true },
    });

    // 3. Cabut semua sesi aktif pengguna terkait (AC-04)
    const deletedSessions = await tx.session.deleteMany({
      where: { userId },
    });

    // 4. Catat AuditLog
    await recordAuditLog(tx, {
      actorId,
      entityType: 'User',
      entityId: userId,
      action: 'RESET_PASSWORD',
      before: { mustChangePassword: user.mustChangePassword },
      after: {
        mustChangePassword: true,
        revokedSessionsCount: deletedSessions.count,
      },
      reason: 'Reset password oleh Super Admin',
    });

    return { success: true };
  });
}
