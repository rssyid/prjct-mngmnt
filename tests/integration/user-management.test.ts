import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/infra/db';
import {
  createUser,
  updateUser,
  resetUserPassword,
  listUsers,
} from '@/domain/admin/user-service';
import { assertCan } from '@/shared/permissions';
import { DomainError } from '@/shared/errors';

describe('User Management and Session Revocation (AC-03, AC-04)', () => {
  const saActorId = `user_sa_${Date.now()}`;
  let createdTargetUserId = '';

  beforeAll(async () => {
    await prisma.user.create({
      data: {
        id: saActorId,
        name: 'Super Admin Test',
        email: `sa_admin_${Date.now()}@example.com`,
        role: 'SUPER_ADMIN',
        isActive: true,
        mustChangePassword: false,
      },
    });
  });

  afterAll(async () => {
    if (createdTargetUserId) {
      await prisma.user.update({
        where: { id: createdTargetUserId },
        data: { isActive: false },
      });
    }
    await prisma.user.update({
      where: { id: saActorId },
      data: { isActive: false },
    });
  });

  it('AC-04 user baru wajib ganti password dulu (mustChangePassword=true)', async () => {
    const targetEmail = `new_user_${Date.now()}@example.com`;
    const user = await createUser(saActorId, {
      name: 'User Baru Uji',
      email: targetEmail,
      role: 'WM_HO_SPECIALIST',
      temporaryPassword: 'TempPassword123!',
    });

    createdTargetUserId = user.id;

    expect(user.mustChangePassword).toBe(true);
    expect(user.role).toBe('WM_HO_SPECIALIST');
    expect(user.isActive).toBe(true);

    // Akun credential harus ada di database
    const account = await prisma.account.findFirst({
      where: { userId: user.id, providerId: 'credential' },
    });
    expect(account).toBeDefined();
    expect(account?.password).toBeTruthy();

    // Menolak email duplikat dengan 409 DUPLICATE
    await expect(
      createUser(saActorId, {
        name: 'Duplikat',
        email: targetEmail,
        role: 'MANAGEMENT_VIEWER',
        temporaryPassword: 'TempPassword123!',
      })
    ).rejects.toThrowError(DomainError);
  });

  it('AC-04 reset password mencabut seluruh sesi aktif dan mengeset mustChangePassword=true', async () => {
    // Simulasikan ada session aktif untuk target user
    await prisma.session.create({
      data: {
        id: `sess_target_${Date.now()}`,
        userId: createdTargetUserId,
        token: `token_${Date.now()}`,
        expiresAt: new Date(Date.now() + 86400 * 1000),
      },
    });

    const sessionBefore = await prisma.session.count({
      where: { userId: createdTargetUserId },
    });
    expect(sessionBefore).toBeGreaterThanOrEqual(1);

    // SA mereset password
    const result = await resetUserPassword(saActorId, createdTargetUserId, {
      temporaryPassword: 'NewTempPassword456!',
    });
    expect(result.success).toBe(true);

    // Verifikasi sesi dicabut
    const sessionAfter = await prisma.session.count({
      where: { userId: createdTargetUserId },
    });
    expect(sessionAfter).toBe(0);

    // Verifikasi user wajib ganti password
    const updatedUser = await prisma.user.findUnique({
      where: { id: createdTargetUserId },
    });
    expect(updatedUser?.mustChangePassword).toBe(true);
  });

  it('AC-03 Specialist ditolak memanggil aksi manajemen user (403 FORBIDDEN_ROLE)', () => {
    const specialistUser = {
      id: createdTargetUserId,
      name: 'Specialist User',
      email: 'spec@example.com',
      role: 'WM_HO_SPECIALIST' as const,
      isActive: true,
    };

    expect(() => assertCan(specialistUser, 'manage:users')).toThrowError(DomainError);
    try {
      assertCan(specialistUser, 'manage:users');
    } catch (err) {
      expect((err as DomainError).code).toBe('FORBIDDEN_ROLE');
      expect((err as DomainError).status).toBe(403);
    }
  });

  it('updateUser dapat menonaktifkan pengguna dan mencabut sesinya', async () => {
    // Buat session baru
    await prisma.session.create({
      data: {
        id: `sess_deact_${Date.now()}`,
        userId: createdTargetUserId,
        token: `token_deact_${Date.now()}`,
        expiresAt: new Date(Date.now() + 86400 * 1000),
      },
    });

    const updated = await updateUser(saActorId, createdTargetUserId, {
      isActive: false,
    });
    expect(updated.isActive).toBe(false);

    const activeSessions = await prisma.session.count({
      where: { userId: createdTargetUserId },
    });
    expect(activeSessions).toBe(0);
  });
});
