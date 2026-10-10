import { describe, it, expect } from 'vitest';
import { assertCan, can, Role } from '@/shared/permissions';
import { DomainError } from '@/shared/errors';

describe('Role and Permissions (AC-02, AC-03)', () => {
  it('AC-02 viewer ditolak di semua aksi mutasi', () => {
    const viewerRole: Role = 'MANAGEMENT_VIEWER';
    expect(can(viewerRole, 'read')).toBe(true);
    expect(can(viewerRole, 'mutate:master')).toBe(false);
    expect(can(viewerRole, 'mutate:project')).toBe(false);
    expect(can(viewerRole, 'manage:users')).toBe(false);

    expect(() =>
      assertCan(
        { id: 'u1', name: 'Viewer', email: 'viewer@example.com', role: viewerRole, isActive: true },
        'mutate:master'
      )
    ).toThrowError(DomainError);

    try {
      assertCan(
        { id: 'u1', name: 'Viewer', email: 'viewer@example.com', role: viewerRole, isActive: true },
        'mutate:master'
      );
    } catch (err) {
      expect((err as DomainError).code).toBe('FORBIDDEN_ROLE');
      expect((err as DomainError).status).toBe(403);
    }
  });

  it('AC-03 specialist diizinkan mutasi operasional namun ditolak di aksi khusus Super Admin', () => {
    const specialistRole: Role = 'WM_HO_SPECIALIST';
    // Diizinkan
    expect(can(specialistRole, 'mutate:master')).toBe(true);
    expect(can(specialistRole, 'mutate:project')).toBe(true);
    expect(can(specialistRole, 'submit:bast')).toBe(true);
    expect(can(specialistRole, 'hold_resume:project')).toBe(true);

    // Khusus Super Admin (Ditolak)
    expect(can(specialistRole, 'manage:users')).toBe(false);
    expect(can(specialistRole, 'manage:approval_matrix')).toBe(false);
    expect(can(specialistRole, 'verify_cancel:bast')).toBe(false);
    expect(can(specialistRole, 'cancel:project')).toBe(false);
    expect(can(specialistRole, 'manage:settings')).toBe(false);
    expect(can(specialistRole, 'manage:trash')).toBe(false);

    const specialistUser = {
      id: 'u2',
      name: 'Specialist',
      email: 'spec@example.com',
      role: specialistRole,
      isActive: true,
    };

    expect(() => assertCan(specialistUser, 'mutate:master')).not.toThrow();

    expect(() => assertCan(specialistUser, 'manage:users')).toThrowError(DomainError);
    try {
      assertCan(specialistUser, 'manage:users');
    } catch (err) {
      expect((err as DomainError).code).toBe('FORBIDDEN_ROLE');
      expect((err as DomainError).status).toBe(403);
    }
  });

  it('super admin diizinkan untuk semua aksi', () => {
    const saUser = {
      id: 'u3',
      name: 'Admin',
      email: 'sa@example.com',
      role: 'SUPER_ADMIN' as Role,
      isActive: true,
    };
    expect(() => assertCan(saUser, 'manage:users')).not.toThrow();
    expect(() => assertCan(saUser, 'verify_cancel:bast')).not.toThrow();
    expect(() => assertCan(saUser, 'mutate:master')).not.toThrow();
  });

  it('user tanpa session melempar UNAUTHENTICATED (401)', () => {
    expect(() => assertCan(null, 'read')).toThrowError(DomainError);
    try {
      assertCan(null, 'read');
    } catch (err) {
      expect((err as DomainError).code).toBe('UNAUTHENTICATED');
      expect((err as DomainError).status).toBe(401);
    }
  });

  it('user nonaktif melempar UNAUTHENTICATED (401)', () => {
    const inactiveUser = {
      id: 'u4',
      name: 'Inactive',
      email: 'inactive@example.com',
      role: 'SUPER_ADMIN' as Role,
      isActive: false,
    };
    expect(() => assertCan(inactiveUser, 'read')).toThrowError(DomainError);
    try {
      assertCan(inactiveUser, 'read');
    } catch (err) {
      expect((err as DomainError).code).toBe('UNAUTHENTICATED');
      expect((err as DomainError).status).toBe(401);
    }
  });
});
