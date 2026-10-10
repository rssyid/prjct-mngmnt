import { DomainError } from './errors';

export type Role = 'SUPER_ADMIN' | 'WM_HO_SPECIALIST' | 'MANAGEMENT_VIEWER';

export type ActionKey =
  | 'read'
  | 'mutate:project'
  | 'mutate:survey'
  | 'mutate:afce'
  | 'mutate:procurement'
  | 'mutate:schedule'
  | 'mutate:progress'
  | 'mutate:payment'
  | 'mutate:master'
  | 'submit:bast'
  | 'hold_resume:project'
  | 'verify_cancel:bast'
  | 'cancel:project'
  | 'manage:users'
  | 'manage:approval_matrix'
  | 'manage:settings'
  | 'manage:holidays'
  | 'manage:trash';

const ROLE_PERMISSIONS: Record<Role, Set<ActionKey>> = {
  SUPER_ADMIN: new Set([
    'read',
    'mutate:project',
    'mutate:survey',
    'mutate:afce',
    'mutate:procurement',
    'mutate:schedule',
    'mutate:progress',
    'mutate:payment',
    'mutate:master',
    'submit:bast',
    'hold_resume:project',
    'verify_cancel:bast',
    'cancel:project',
    'manage:users',
    'manage:approval_matrix',
    'manage:settings',
    'manage:holidays',
    'manage:trash',
  ]),
  WM_HO_SPECIALIST: new Set([
    'read',
    'mutate:project',
    'mutate:survey',
    'mutate:afce',
    'mutate:procurement',
    'mutate:schedule',
    'mutate:progress',
    'mutate:payment',
    'mutate:master',
    'submit:bast',
    'hold_resume:project',
  ]),
  MANAGEMENT_VIEWER: new Set(['read']),
};

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  mustChangePassword?: boolean;
}

export function can(role: Role, action: ActionKey): boolean {
  return ROLE_PERMISSIONS[role]?.has(action) ?? false;
}

export function assertCan(
  user: AuthUser | null | undefined,
  action: ActionKey
): asserts user is AuthUser {
  if (!user) {
    throw new DomainError('UNAUTHENTICATED', 'Silakan masuk terlebih dahulu untuk melanjutkan');
  }

  if (!user.isActive) {
    throw new DomainError('UNAUTHENTICATED', 'Akun Anda telah dinonaktifkan');
  }

  if (!can(user.role, action)) {
    throw new DomainError(
      'FORBIDDEN_ROLE',
      'Peran Anda tidak memiliki hak akses untuk melakukan aksi ini'
    );
  }
}
