import { headers } from 'next/headers';
import { auth } from './auth';
import { prisma } from './db';
import { DomainError } from '@/shared/errors';
import type { AuthUser, Role } from '@/shared/permissions';

export async function getSessionUser(request?: Request): Promise<AuthUser | null> {
  try {
    const reqHeaders = request ? request.headers : await headers();
    const session = await auth.api.getSession({
      headers: reqHeaders,
    });

    if (!session || !session.user) {
      return null;
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
      },
    });

    if (!dbUser || !dbUser.isActive) {
      return null;
    }

    return {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role as Role,
      isActive: dbUser.isActive,
      mustChangePassword: dbUser.mustChangePassword,
    };
  } catch {
    return null;
  }
}

export async function requireSessionUser(request?: Request): Promise<AuthUser> {
  const user = await getSessionUser(request);
  if (!user) {
    throw new DomainError('UNAUTHENTICATED', 'Silakan masuk terlebih dahulu untuk melanjutkan');
  }
  return user;
}
